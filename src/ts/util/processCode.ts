import {abcRender} from "../markdown/abcRender";
import {chartRender} from "../markdown/chartRender";
import {codeRender} from "../markdown/codeRender";
import {flowchartRender} from "../markdown/flowchartRender";
import {graphvizRender} from "../markdown/graphvizRender";
import {highlightRender} from "../markdown/highlightRender";
import {mathRender} from "../markdown/mathRender";
import {mermaidRender} from "../markdown/mermaidRender";
import {mindmapRender} from "../markdown/mindmapRender";
import {plantumlRender} from "../markdown/plantumlRender";

export const processPasteCode = (html: string, text: string, type = "sv") => {
    return false;
};

export const processCodeRender = (previewPanel: HTMLElement, vditor: IVditor) => {
    if (!previewPanel) {
        return;
    }
    if (previewPanel.parentElement.getAttribute("data-type") === "html-block") {
        previewPanel.setAttribute("data-render", "1");
        return;
    }
    const language = previewPanel.firstElementChild.className.replace("language-", "");
    if (!language) {
        return;
    }
    if (language === "abc") {
        abcRender(previewPanel, vditor.options.cdn);
    } else if (language === "mermaid") {
        mermaidRender(previewPanel, vditor.options.cdn, vditor.options.theme);
    } else if (language === "flowchart") {
        flowchartRender(previewPanel, vditor.options.cdn);
    } else if (language === "echarts") {
        chartRender(previewPanel, vditor.options.cdn, vditor.options.theme);
    } else if (language === "mindmap") {
        mindmapRender(previewPanel, vditor.options.cdn, vditor.options.theme);
    } else if (language === "plantuml") {
        plantumlRender(previewPanel, vditor.options.cdn);
    } else if (language === "graphviz") {
        graphvizRender(previewPanel, vditor.options.cdn);
    } else if (language === "math") {
        mathRender(previewPanel, {cdn: vditor.options.cdn,extPath: vditor.options.extPath, math: vditor.options.preview.math});
    } else {
        highlightRender(Object.assign({}, vditor.options.preview.hljs), previewPanel, vditor.options.cdn);
        codeRender(previewPanel);
    }

    previewPanel.setAttribute("data-render", "1");
};
