

export const pager_shadowContent = document.createElement('template');
pager_shadowContent.innerHTML = `
<style>
button { cursor: pointer }
.app-pager {
    color: gray;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: monospace;
    font-size: 1rem;
    user-select: none;
}
.app-pager button,
.app-pager input {
    border: 1px solid #ccc;
    border-radius: 5px;
    font-family: inherit;
    font-size: inherit;
    background: var(--color-scheme-background, #ffffff);
    transition: .2s;
}
.app-pager button {
    padding: 1px 6px;
}
.app-pager input {
    padding: 5px;
}
.app-pager button:hover,
.app-pager input:hover {
    background: var(--color-scheme-hover-background, #f0f0f0);
}
.app-pager button:active {
    background: var(--color-scheme-active-background, #e0e0e0);
}

</style>

<div class="app-pager-container app-pager" id="container">
    <button id="prev">&lt;</button>
    <span>
        <input type="number" id="current">
        <span>/</span>
        <span id="total"></span>
    </span>
    <button id="next">&gt;</button>
</div>
`;


export class HTMLMyPagerElement extends HTMLElement {
    #shadowRoot = null;

    constructor() {
        super();

        this.#shadowRoot = this.attachShadow({ mode: 'open' });
        this.#shadowRoot.append(pager_shadowContent.content.cloneNode(true));
        
        defineNumberAttr(this, 'count', { min: 0 });
        defineNumberAttr(this, 'pageSize', { min: 1 }, 'page-size');
        defineNumberAttr(this, 'value', { validator: value => value <= this.pages && value > 0 });

        this.#registerEventListeners();

    }

    #inited = false;
    connectedCallback() {
        if (!this.#inited) {
            this.#inited = true;
            this.count = this.pageSize = this.value = 1;
        }
    }

    #registerEventListeners() {
        this.#q('#current').on('change', (ev) => {
            ev.stopPropagation();
            if (!this.#q('#current').checkValidity()) {
                this.#q('#current').value = this.value;
            } else {
                const evt = new CustomEvent('beforechange', {
                    bubbles: false, cancelable: true,
                    detail: {
                        newValue: this.#q('#current').value,
                    },
                });
                if (!this.dispatchEvent(evt)) {
                    this.#q('#current').value = this.value;
                } else {
                    this.value = this.#q('#current').value;
                }
            }
        });
        const prevOrNextHandler = (ev) => {
            const newValue = this.value + (ev.target.id === 'prev' ? -1 : 1);
            if (newValue < 1 || newValue > this.pages) {
                return false;
            }

            const evt = new CustomEvent('beforechange', {
                bubbles: false, cancelable: true,
                detail: { newValue },
            });
            if (this.dispatchEvent(evt)) {
                this.value = newValue;
            }
        };
        this.#q('#prev').on('click', prevOrNextHandler);
        this.#q('#next').on('click', prevOrNextHandler);


    }

    #qc = new Map();
    #q(selector) {
        if (this.#qc.has(selector)) return this.#qc.get(selector);
        const val = this.#shadowRoot.lastElementChild.querySelector(selector);
        if (val) {
            if (!val.on) val.on = val.addEventListener;
            this.#qc.set(selector, val);
        }
        return val;
    }

    static get observedAttributes() {
        return 'count value page-size'.split(' ');
    }
    attributeChangedCallback(name, oldValue, newValue) {
        this.recompute({ changed: name });
    }

    get pages() { return Math.max(1, Math.ceil(this.count / this.pageSize)) }
    recompute(attr = {}) {
        this.#q('#current').value = this.value,
        this.#q('#current').min = 1,
        this.#q('#current').max = this.pages,
        this.#q('#total').innerText = this.pages;
        
        if (attr.changed === 'value') {
            const evt = new CustomEvent('change', {
                bubbles: true, cancelable: false,
                detail: { newValue: this.value },
            });
            this.dispatchEvent(evt);
        }
    }

}


function defineNumberAttr(obj, p, range = { min: -Infinity, max: Infinity }, a = p, configurable = false) {
    return Object.defineProperty(obj, p, {
        get() {
            const attr = +obj.getAttribute(a);
            return isNaN(attr) ? 0 : attr;
        },
        set(value) {
            if (isNaN(value)) return false;
            let newValue = Math.min(Math.max(+value, range.min || -Infinity), range.max || Infinity);
            if (range.validator) if (!range.validator.call(obj, newValue)) return false;
            obj.setAttribute(a, newValue);
            return true;
        },
        enumerable: true,
        configurable
    });
}


customElements.define('my-pager', HTMLMyPagerElement);

