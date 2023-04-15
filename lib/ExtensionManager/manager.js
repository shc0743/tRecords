



let translation_table = {};
export const translations = new Proxy({}, {
    get(target, p, receiver) {
        if (Reflect.has(translation_table, p)) return Reflect.get(translation_table, p);
        return p;
    },
    set(target, p, newValue, receiver) {
        return false;
    },
    has(target, p) {
        return Reflect.has(translation_table, p);
    },
});
export const tr = function (p) { return translations[p] };

const path = import.meta.url.replace(/manager\.js$/, '');
try {
    translation_table = await (await fetch(path + `lang/${navigator.language}.json`)).json();
} catch {
    try {
        translation_table = await (await fetch(path + `lang/en-US.json`)).json();
    } catch (error) {
        console.error('[manager]', '[translation]', 'Failed to load translations:', error);
    }
}


export const extensionManager_content = document.createElement('template');
extensionManager_content.innerHTML = /*html*/`
<div style="margin-bottom: 10px; color: gray; font-size: small;">${tr('ext_d1')}</div>
<fieldset>
    <legend>${tr('myext')}</legend>
    <div id="myExt"></div>
    <style>#myExt:empty::after { content: "${tr('noext')}"; }</style>
</fieldset>
<style>#status_feedback:empty{display:none}</style>
<div style="margin-top: 10px" class="cbox errorbox" id="status_feedback"></div>
<div style="margin-top: 10px" class="cbox infobox" id="changedTips" hidden>${tr('reloadReq')} <a href="javascript:" id="reloadNow">${tr('reloadNow')}</a></div>
<div style="margin-top: 10px; font-size: small;"><a href="javascript:" id="moreExt">${tr('moreext')}</a></div>
<dialog id=moreExts>
    <div>${tr('chooseExt')}</div>
    <div id=extsList></div>
    <fieldset id=installFromUrl>
        <legend>${tr('orInstallFromUrl')}</legend>
        <div style="display: flex;">
            <input type=url id=url style="flex: 1;" />
            <div style="margin-left: 0.5em;"><button type=button id=installUrl>${tr('install')}</button></div>
        </div>
    </fieldset>
    <fieldset id=installFromLocal>
        <legend>${tr('orInstallLocal')}</legend>
        <div style="display: flex;">
            <input type=file id=inst_localfile accept=text/javascript style="flex: 1;" />
            <div style="margin-left: 0.5em;"><button type=button id=installLocal>${tr('install')}</button></div>
        </div>
    </fieldset>
    <div style="text-align: right; margin-top: 0.5em;"><button type=button id=closMext>${tr('cancel')}</button></div>
</dialog>
`+ `
<style>
*:disabled, *[disabled] {
    cursor: not-allowed;
}
a, button, summary {
    cursor: pointer;
}
a {
    text-decoration: none;
}
a:hover {
    text-decoration: underline;
}
[hidden] {
    display: none!important;
}

::selection {
    background-color: rgb(141 199 248 / 60%);
}
</style>
<style>
.cbox {
    border: 1px solid var(--border-color, #cdcdcd);
    border-radius: 5px;
    padding: 10px;
}
.cbox.infobox {
    background-color: #e5f3fe;
}
.cbox.errorbox {
    background-color: #fbe5eb;
}
</style>
<style>
#moreExts {
    padding: 10px;
    width: calc(100% - 4em);
    height: calc(100% - 4em);
    flex-direction: column;
    overflow: hidden;
}
#moreExts[open] {
    display: flex;
}
#extsList {
    margin: 10px 0;
    padding: 10px;
    border: 1px solid gray;
    border-radius: 5px;
    overflow: auto;
    flex: 1;
}
.ext-card {
    border-radius: 10px;
    border: 1px solid gray;
    padding: 10px;
    margin: 10px 0;
    word-break: break-all;
}
.ext-card-title {
    font-weight: bold;
}
#extsList > .ext-card:nth-child(1) {
    margin-top: 0;
}
.ext-card-row {
    margin: 5px 0;
}
.ext-card-secondary {
    color: gray;
    font-size: small;
}
.ext-card-buttons {
    text-align: right;
}
</style>
`;

const c = new Proxy({}, {
    get(target, p, receiver) {
        if (typeof p !== 'string') return Reflect.get(target, p, receiver);
        if (!isNaN(Number(p))) {
            const n = (Number(p));
            return function createElements(tag, props = {}) {
                const arr = [];
                for (let i = 0; i < n; ++i) {
                    const el = document.createElement(tag);
                    if (props) for (const i in props) el[i] = props[i];
                    arr.push(el);
                }
                return arr;
            }
        }
        return document.createElement(p);
    },
});

export class ExtensionManager {
    #el = null;
    #shadowRoot = null;
    #indexPath = '';

    constructor({
        getData = function (key) {},
        setData = function (key, value) { },
        indexPath = 'index.json',
        
    }) {
        this.#getData = getData, this.#setData = setData;
        this.#indexPath = indexPath;
        this.#el = document.createElement('div');
        this.#shadowRoot = this.#el.attachShadow({ mode: 'open' });
        this.#shadowRoot.append(extensionManager_content.content.cloneNode(true));

        queueMicrotask(() => this.#init());
    }


    #Lext = null;
    async #init() {
        const $ = s => this.#shadowRoot.querySelector(s);

        const Mext = $('#moreExts');
        this.#Lext = $('#extsList');
        $('#moreExt').onclick = () => {
            $('#url').disabled = true;
            Mext.showModal();
            this.#loadExtList();
            queueMicrotask(() => $('#url').disabled = false);
        };
        $('#closMext').onclick = () => Mext.close();
        $('#installUrl').onclick = () => {
            if (!confirm(tr('third-party-url-confirm'))) return;
            const u = $('#url').value;
            if (!u) return;
            this.installUI(u);
        };
        $('#installLocal').onclick = () => {
            if (!confirm(tr('third-party-url-confirm'))) return;
            const lf = $('#inst_localfile');
            if (!lf.value) return;
            const file = lf.files[0];
            const u = URL.createObjectURL(file);
            this.installUI(u);
        };
        $('#reloadNow').onclick = () => location.reload();

        queueMicrotask(() => this.#loadInstList());
        queueMicrotask(() => this.#run());
    }
    #loadExtList() {
        fetch(this.#indexPath, { cache: "no-store" }).then(v => v.json()).then(async (exts) => {
            this.#Lext.innerHTML = '';
            for (const i of exts) {
                const el = c.div;
                el.className = 'ext-card';
                const title = c.div;
                title.className = 'ext-card-title';
                const instbtn = c.button;
                instbtn.append(tr('install'));
                const name = c.span;
                name.append(i.name);
                title.append(instbtn, ' ', name);
                const cont = c.div;
                cont.className = 'ext-card-content';
                const rows = c[1]('div', { className: 'ext-card-secondary ext-card-row' });
                rows[0].append('Script URL:', ' ', i.script.path);
                cont.append.apply(cont, rows);
                el.append(title, cont);
                this.#Lext.append(el);
                if (i.script?.type !== 'text/javascript') instbtn.replaceWith(document.createTextNode('[' + tr('formatNotSupported') + ']'));

                instbtn.onclick = () => {
                    instbtn.disabled = true;
                    this.installUI(i.script.path);
                };
            }
        }).catch(error => {
            this.#shadowRoot.querySelector('#extsList').innerHTML = `Error: ${error}`;
        });
    }
    async #loadInstList(showTip = false) {
        const myext = this.#shadowRoot.querySelector('#myExt');
        const exts = await this.getData('extensions::installed') || [];
        myext.innerHTML = '';
        for (const i of exts) {
            const el = c.div;
            el.className = 'ext-card';
            const title = c.label;
            title.className = 'ext-card-title';
            const enablebtn = c.input;
            enablebtn.type = 'checkbox';
            enablebtn.checked = i.enabled;
            const name = c.span;
            name.append(i.name);
            title.append(enablebtn, ' ', name);
            const cont = c.div;
            cont.className = 'ext-card-content';
            const rows = c[3]('div', { className: 'ext-card-secondary ext-card-row' });
            rows[0].innerText = i.id;
            rows[1].append('Script URL:', ' ', i.url);
            cont.append.apply(cont, rows);
            const [btns] = c[1]('div', { className: 'ext-card-buttons' });
            const uninstbtn = c.button;
            uninstbtn.append(tr('uninstall'));
            btns.append(uninstbtn);
            cont.append(btns);
            el.append(title, cont);
            myext.append(el);

            enablebtn.onchange = () => {
                this.enable(i.id, enablebtn.checked, { noRefresh: true });
            };
            uninstbtn.onclick = () => {
                if (!confirm(tr('uninst.confirm'))) return;
                this.uninstall(i.id);
            }
        }

        if (showTip) this.#shadowRoot.querySelector('#changedTips').hidden = false;
    }


    #getData = async function () {};
    #setData = async function () {};
    async getData(key) {
        const r = this.#getData(key);
        return (r instanceof Promise) ? (await r) : r;
    }
    async setData(key, value) {
        const r = this.#setData(key, value);
        return (r instanceof Promise) ? (await r) : r;
    }


    mount(element) {
        element.append(this.#el);
    }


    async #run() {
        const ext = await this.getData('extensions::installed') || [];
        for (const i of ext) try {
            if (!i.enabled) continue;
            const scopes = i.scopes;
            let scopeGood = (scopes == null) ? true : false;
            if (!scopeGood) for (const i of scopes) {
                const regexp = new RegExp(i, 'i');
                if (regexp.test(location.origin + location.pathname)) {
                    scopeGood = true;
                    break;
                }
            }
            if (!scopeGood) continue;

            queueMicrotask(() => {
                const uniqueId = '__ext_manager_url_' + i.id + '__';
                const str1 = `/* Created by ExtensionManager */\n\n{URL.revokeObjectURL(globalThis[\`${uniqueId}\`]);delete globalThis[\`${uniqueId}\`]}\n\n\n`;
                const str2 = `\n\n//# sourceMappingURL = ${i.url}`;
                const newBlob = new Blob([str1, i.blob, str2], { type: 'text/javascript' });
                const url = URL.createObjectURL(newBlob);
                globalThis[uniqueId] = url;
                queueMicrotask(() => { import(url) });
            });

            if (navigator.onLine) fetch(i.url, { method: 'HEAD', cache: 'no-store' }).then(v => {
                const etag = v.headers.get('etag');
                if (etag !== i.etag) {
                    console.info('[Extension Manager]', 'update detected:', i.id, ', calling updater');
                    this.install(i.url).catch(console.error);
                }
            }).catch(function (error) { /* sentry API */ });
        } catch (error) { console.warn('Error loading extension', i, ':', error) }
    }
    run() { return this.#run.apply(this, arguments) }


    async enable(id, bEnable = true, { noRefresh = false } = {}) {
        const oldData = await this.getData('extensions::installed') || [];
        const newData = oldData.map(value => {
            if (value?.id === id) {
                value = structuredClone(value);
                value.enabled = bEnable;
                return value;
            } else return value;
        });
        await this.setData('extensions::installed', newData);
        if (!noRefresh) this.#loadInstList(true);
    }
    async install(url) {
        const urlBase = new URL(this.#indexPath, window.location);
        const urlScript = new URL(url, urlBase);

        const resp = await fetch(urlScript, { cache: 'no-store' });
        const blob = await resp.blob();
        const text = await blob.text();

        const metadata_flag = { start: '[==BEGIN=EXTENSION=METADATA==]', end: '[==END=EXTENSION=METADATA==]' };
        const metadata_start = text.indexOf(metadata_flag.start), metadata_end = text.indexOf(metadata_flag.end);
        if (metadata_end < 0 || metadata_start < 0) throw new TypeError('Invalid Data');
        const metadata_str = (text.substring(metadata_start + metadata_flag.start.length, metadata_end));
        const metadata = JSON.parse(metadata_str);
        
        if (!(metadata.id)) throw new TypeError('Invalid Data');

        const oldData = await this.getData('extensions::installed') || [];
        const newData = oldData.filter(el => el.id !== metadata.id);
        newData.push({
            id: metadata.id,
            url: urlScript.href,
            blob: blob,
            name: metadata.name,
            etag: resp.headers.get('etag'),
            scopes: metadata.scopes,
            enabled: true,
            metadata,
        })
        await this.setData('extensions::installed', newData);
        
        this.#shadowRoot.querySelector('#moreExts').close();
        this.#loadInstList(true);
    }
    async uninstall(id) {
        const oldData = await this.getData('extensions::installed') || [];
        const newData = oldData.filter(value => value?.id !== id);
        await this.setData('extensions::installed', newData);
        this.#loadInstList(true);
    }

    installUI() {
        const $ = s => this.#shadowRoot.querySelector(s);
        const moreExts = $('#moreExts');
        moreExts.open && moreExts.close();
        const feedback = $('#status_feedback');

        feedback.innerHTML = '';

        const p = this.install.apply(this, arguments);
        p.catch(error => feedback.innerText = String(error));

        return p;
    }


};


