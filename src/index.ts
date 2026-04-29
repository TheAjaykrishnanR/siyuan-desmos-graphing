import {
    Plugin,
    getFrontend,
    getBackend,
    Protyle,
    fetchPost,
} from "siyuan";
import "./index.scss";

const STORAGE_NAME = "menu-config";

export default class DesmosGraphing extends Plugin {

    private isMobile: boolean;
    private boundHandleMessage: (event: MessageEvent) => void;
    private lastSavedState = new Map<string, string>();

    onload() {
        this.data[STORAGE_NAME] = {readonlyText: "Readonly"};

        const frontEnd = getFrontend();
        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";

        this.protyleSlash = [{
            filter: ["desmos", "graph", "math", "数学", "绘图"],
            html: `<div class="b3-list-item__first"><span class="b3-list-item__text">${this.i18n.insertDesmos}</span><span class="b3-list-item__meta">📈</span></div>`,
            id: "insertDesmos",
            callback: (protyle: Protyle) => {
                protyle.insert(`<iframe src="/plugins/${this.name}/offline-desmos/desmos.html" style="width: 100%; height: 500px;" data-subtype="iframe"></iframe>`, true);
            }
        }];

        this.boundHandleMessage = this.handleMessage.bind(this);
        window.addEventListener('message', this.boundHandleMessage);
    }

    onunload() {
        window.removeEventListener('message', this.boundHandleMessage);
    }

    private handleMessage(event: MessageEvent) {
        if (!event.data || typeof event.data !== 'object') return;
        
        if (event.data.type === 'desmos-ready') {
            const iframes = document.querySelectorAll('iframe');
            for (const iframe of Array.from(iframes)) {
                if (iframe.contentWindow === event.source) {
                    const blockElement = this.findBlockElement(iframe);
                    if (blockElement) {
                        const blockId = blockElement.getAttribute('data-node-id');
                        const stateStr = blockElement.getAttribute('custom-desmos-state');
                        if (stateStr) {
                            try {
                                const decoded = decodeURIComponent(stateStr);
                                iframe.contentWindow.postMessage({ type: 'set-state', state: JSON.parse(decoded) }, '*');
                                if (blockId) this.lastSavedState.set(blockId, decoded);
                            } catch (e) {
                                console.error('Desmos V4: Failed to restore state', e);
                            }
                        }
                    }
                    break;
                }
            }
        } else if (event.data.type === 'state-changed') {
            const iframes = document.querySelectorAll('iframe');
            for (const iframe of Array.from(iframes)) {
                if (iframe.contentWindow === event.source) {
                    const blockElement = this.findBlockElement(iframe);
                    if (blockElement) {
                        const blockId = blockElement.getAttribute('data-node-id');
                        if (!blockId) continue;

                        const newStateStr = JSON.stringify(event.data.state);
                        const savedStateStr = blockElement.getAttribute('custom-desmos-state');
                        const currentSaved = savedStateStr ? decodeURIComponent(savedStateStr) : (this.lastSavedState.get(blockId) || "");

                        if (currentSaved !== newStateStr) {
                            this.lastSavedState.set(blockId, newStateStr);
                            const encoded = encodeURIComponent(newStateStr);
                            
                            // Update local DOM so it's available immediately
                            blockElement.setAttribute('custom-desmos-state', encoded);

                            // Try to persist
                            fetchPost("/api/attr/setBlockAttrs", {
                                id: blockId,
                                attrs: {
                                    "custom-desmos-state": encoded
                                }
                            }, (res) => {
                                if (res.code !== 0) {
                                    fetchPost("/api/block/setBlockAttrs", {
                                        id: blockId,
                                        attrs: {
                                            "custom-desmos-state": encoded
                                        }
                                    }, (res2) => {
                                        if (res2.code !== 0) {
                                            console.error('Desmos V4: Persist failed entirely', res2);
                                        }
                                    });
                                }
                            });
                        }
                    }
                    break;
                }
            }
        }
    }

    private findBlockElement(element: HTMLElement): HTMLElement | null {
        let parent: HTMLElement | null = element;
        while (parent && parent !== document.body) {
            if (parent.hasAttribute('data-node-id')) {
                return parent;
            }
            parent = parent.parentElement;
        }
        return null;
    }
}
