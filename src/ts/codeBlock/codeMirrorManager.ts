import {defaultKeymap, indentWithTab} from "@codemirror/commands";
import {LanguageDescription, LanguageSupport} from "@codemirror/language";
import {languages} from "@codemirror/language-data";
import {Compartment} from "@codemirror/state";
import {EditorView, drawSelection, keymap} from "@codemirror/view";
import {basicSetup} from "codemirror";

import {afterRenderEvent} from "../wysiwyg/afterRenderEvent";

const SPECIAL_LANGUAGES = [
    "mermaid", "flowchart", "echarts", "mindmap", "plantuml", "abc", "graphviz", "math",
];

const CM_HOST_CLASS = "vditor-cm-host";
export const CM_BLOCK_CLASS = "vditor-code-block--cm";

interface CodeMirrorBinding {
    view: EditorView;
    languageCompartment: Compartment;
    editPre: HTMLElement;
    syncCode: HTMLElement;
    updating: boolean;
    syncTimer: number;
    languageName: string;
}

const bindings = new WeakMap<HTMLElement, CodeMirrorBinding>();

const languageMap: Record<string, LanguageDescription> = {};
for (const language of languages) {
    for (const alias of language.alias) {
        languageMap[alias.toLowerCase()] = language;
    }
}

export const isSpecialCodeLanguage = (codeElement: HTMLElement) => {
    for (const lang of SPECIAL_LANGUAGES) {
        if (codeElement.classList.contains(`language-${lang}`)) {
            return true;
        }
    }
    return false;
};

export const isWysiwygCmCodeBlock = (blockElement: HTMLElement | null) => {
    if (!blockElement || blockElement.getAttribute("data-type") !== "code-block") {
        return false;
    }
    const code = blockElement.querySelector("pre.vditor-wysiwyg__pre code, pre:first-child code") as HTMLElement;
    return !!code && !isSpecialCodeLanguage(code);
};

export const isInsideWysiwygCodeMirror = (target: EventTarget | Node | null) => {
    if (!target) {
        return !!document.activeElement?.closest(`.${CM_BLOCK_CLASS} .cm-editor`);
    }
    const node = target instanceof Element ? target : (target as Node).parentElement;
    return !!node?.closest(`.${CM_BLOCK_CLASS} .cm-editor`);
};

const getLanguageName = (codeElement: HTMLElement) => {
    const match = codeElement.className.match(/language-([^\s]+)/);
    return match ? match[1] : "";
};

const getBlockParts = (blockElement: HTMLElement) => {
    const editPre = blockElement.querySelector("pre.vditor-wysiwyg__pre, pre:first-child") as HTMLElement;
    if (!editPre) {
        return null;
    }
    const code = editPre.querySelector("code");
    if (!code) {
        return null;
    }
    const preview = blockElement.querySelector(".vditor-wysiwyg__preview") as HTMLElement;
    return {editPre, code, preview};
};

/** 普通代码块只保留隐藏的 sync code + CodeMirror，移除/隐藏 legacy 编辑与预览 DOM */
export const prepareWysiwygCmBlockDom = (blockElement: HTMLElement) => {
    if (!isWysiwygCmCodeBlock(blockElement)) {
        return;
    }
    const parts = getBlockParts(blockElement);
    if (!parts) {
        return;
    }
    const {editPre, code, preview} = parts;
    blockElement.classList.add(CM_BLOCK_CLASS);
    editPre.classList.add(CM_HOST_CLASS);
    editPre.setAttribute("contenteditable", "false");
    editPre.style.display = "block";
    code.setAttribute("contenteditable", "false");
    code.setAttribute("hidden", "");
    code.setAttribute("aria-hidden", "true");
    code.style.display = "none";
    if (preview) {
        preview.remove();
    }
};

const loadLanguage = (languageName: string): Promise<LanguageSupport | undefined> => {
    const language = languageMap[languageName.toLowerCase()];
    if (!language) {
        return Promise.resolve(undefined);
    }
    if (language.support) {
        return Promise.resolve(language.support);
    }
    return language.load();
};

const scheduleSync = (binding: CodeMirrorBinding, vditor: IVditor) => {
    window.clearTimeout(binding.syncTimer);
    binding.syncTimer = window.setTimeout(() => {
        afterRenderEvent(vditor, {
            enableAddUndoStack: true,
            enableHint: false,
            enableInput: true,
        });
    }, vditor.options.undoDelay);
};

const syncCodeFromView = (binding: CodeMirrorBinding, vditor: IVditor) => {
    binding.syncCode.textContent = binding.view.state.doc.toString();
    scheduleSync(binding, vditor);
};

const syncViewFromCode = (binding: CodeMirrorBinding) => {
    const codeText = binding.syncCode.textContent || "";
    const cmText = binding.view.state.doc.toString();
    if (codeText === cmText) {
        return;
    }
    binding.updating = true;
    binding.view.dispatch({
        changes: {from: 0, to: cmText.length, insert: codeText},
    });
    binding.updating = false;
};

const applyLanguage = (blockElement: HTMLElement, binding: CodeMirrorBinding, languageName: string) => {
    if (binding.languageName === languageName) {
        return;
    }
    loadLanguage(languageName).then((lang) => {
        if (!lang || !bindings.has(blockElement)) {
            return;
        }
        binding.view.dispatch({
            effects: binding.languageCompartment.reconfigure(lang),
        });
        binding.languageName = languageName;
    });
};

const destroyWysiwygCodeMirror = (blockElement: HTMLElement) => {
    const binding = bindings.get(blockElement);
    if (!binding) {
        return;
    }
    window.clearTimeout(binding.syncTimer);
    binding.syncCode.textContent = binding.view.state.doc.toString();
    binding.view.destroy();
    bindings.delete(blockElement);
    binding.editPre.querySelector(".cm-editor")?.remove();
    prepareWysiwygCmBlockDom(blockElement);
};

export const destroyAllWysiwygCodeMirrors = (vditor: IVditor) => {
    vditor.wysiwyg.element.querySelectorAll(`.${CM_BLOCK_CLASS}`).forEach((block) => {
        destroyWysiwygCodeMirror(block as HTMLElement);
    });
};

/** Spin DOM 前卸载 CodeMirror，保持 sync code 隐藏，不露出 legacy 编辑区 */
export const deactivateAllWysiwygCodeMirrors = (vditor: IVditor) => {
    vditor.wysiwyg.element.querySelectorAll(".vditor-wysiwyg__block[data-type='code-block']").forEach((block) => {
        const blockElement = block as HTMLElement;
        if (bindings.has(blockElement)) {
            destroyWysiwygCodeMirror(blockElement);
        } else {
            prepareWysiwygCmBlockDom(blockElement);
        }
    });
};

const mountWysiwygCodeMirror = (blockElement: HTMLElement, vditor: IVditor) => {
    if (!isWysiwygCmCodeBlock(blockElement)) {
        return;
    }

    prepareWysiwygCmBlockDom(blockElement);

    const parts = getBlockParts(blockElement);
    if (!parts) {
        return;
    }

    const existing = bindings.get(blockElement);
    if (existing) {
        syncViewFromCode(existing);
        const languageName = getLanguageName(parts.code);
        if (existing.languageName !== languageName) {
            existing.syncCode.className = parts.code.className;
            applyLanguage(blockElement, existing, languageName);
        }
        return;
    }

    const {editPre, code} = parts;
    const languageCompartment = new Compartment();
    const languageName = getLanguageName(code);

    const binding: CodeMirrorBinding = {
        view: null as unknown as EditorView,
        languageCompartment,
        editPre,
        syncCode: code,
        updating: false,
        syncTimer: 0,
        languageName: "",
    };

    const view = new EditorView({
        doc: code.textContent || "",
        parent: editPre,
        extensions: [
            basicSetup,
            drawSelection(),
            keymap.of([...defaultKeymap, indentWithTab]),
            languageCompartment.of([]),
            EditorView.updateListener.of((update) => {
                if (binding.updating || !update.docChanged) {
                    return;
                }
                syncCodeFromView(binding, vditor);
            }),
            EditorView.domEventHandlers({
                mousedown: (event) => {
                    event.stopPropagation();
                },
                click: (event) => {
                    event.stopPropagation();
                },
                keydown: (event) => {
                    event.stopPropagation();
                },
                keyup: (event) => {
                    event.stopPropagation();
                },
                input: (event) => {
                    event.stopPropagation();
                },
            }),
        ],
    });

    binding.view = view;
    bindings.set(blockElement, binding);
    applyLanguage(blockElement, binding, languageName);
};

export const renderWysiwygCodeBlocks = (vditor: IVditor) => {
    if (vditor.currentMode !== "wysiwyg") {
        return;
    }
    vditor.wysiwyg.element.querySelectorAll(".vditor-wysiwyg__block[data-type='code-block']").forEach((block) => {
        mountWysiwygCodeMirror(block as HTMLElement, vditor);
    });
};

export const focusWysiwygCodeMirror = (
    blockElement: HTMLElement,
    collapseToStart = true,
    vditor?: IVditor,
) => {
    if (!blockElement) {
        return;
    }
    if (!bindings.get(blockElement) && vditor) {
        mountWysiwygCodeMirror(blockElement, vditor);
    }
    const binding = bindings.get(blockElement);
    if (!binding) {
        return;
    }
    binding.view.focus();
    if (collapseToStart) {
        binding.view.dispatch({
            selection: {anchor: 0, head: 0},
            scrollIntoView: true,
        });
    } else {
        const length = binding.view.state.doc.length;
        binding.view.dispatch({
            selection: {anchor: length, head: length},
            scrollIntoView: true,
        });
    }
};

export const updateWysiwygCodeMirrorLanguage = (blockElement: HTMLElement, languageName: string) => {
    const binding = bindings.get(blockElement);
    if (!binding) {
        return;
    }
    binding.syncCode.className = languageName ? `language-${languageName}` : "";
    applyLanguage(blockElement, binding, languageName);
};

export const hasWysiwygCodeMirror = (blockElement: HTMLElement) => bindings.has(blockElement);

export const getWysiwygCodeMirrorView = (blockElement: HTMLElement) => bindings.get(blockElement)?.view;
