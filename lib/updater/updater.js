




export async function clearCache(cacheName) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    for (const i of keys) {
        cache.delete(i);
    }
    return true;
}


export const availableUpdateOptions = [0, 1, 2, 3, 4, { id: 5, disabled: true }, 6];
export const defaultUpdateOption = 3;
export const updateCheckingDelayLimits = {
    min: 600 * 1000,       // 10 minutes
    max: 86400 * 7 * 1000,  // 7 days
};
export const updateKey = window.location.pathname.replaceAll(/(\/|\\|\:|\;|\"|\'|\+|\=|\[|\]|\(|\)|\,|\.)/g, '_');
export const updateProgKey = 'updateProgress-' + updateKey;
export const updateDataKey = 'updateData-' + updateKey;


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

const path = import.meta.url.replace(/updater\.js$/, '');
try {
    translation_table = await (await fetch(path + `lang/${navigator.language}.json`)).json();
} catch {
    try {
        translation_table = await (await fetch(path + `lang/en-US.json`)).json();
    } catch (error) {
        console.error('[updater]', '[translation]', 'Failed to load translations:', error);
    }
}



export const updateManager_content = document.createElement('template');
updateManager_content.innerHTML = /*html*/`<div id=container>
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
#autoupdate_config {
    font-size: small;
    font-family: monospace;
}
#cfgau {
    display: inline-block;
    width: 2em; opacity: 0;
    position: absolute;
    cursor: pointer;
}
#cfgaut {
    border: 1px solid;
    border-radius: 5px;
    padding: 5px; font-size: large;
}
.update-widget.text-tip {
    height: 3em;
    display: grid;
    place-items: center;
}
#updates .opts {
    font-family: Consolas, monospace;
}
#iav_container {
    padding: 10px;
    width: calc(100% - 4em);
    height: calc(100% - 4em);
    flex-direction: column;
    overflow: hidden;
}
#iav_container[open] {
    display: flex;
}
#iav_items {
    margin: 10px 0;
    padding: 10px;
    border: 1px solid gray;
    border-radius: 5px;
    overflow: auto;
    flex: 1;
}
#iav_items:empty {
    display: grid; place-items: center;
}
#iav_items:empty::after {
    content: "${tr('iav_nover')}";
}
#iav_items[data-loading]::after {
    content: "${tr('iav_loading')}";
}
</style>
<style>
.infobox {
    background: #e5f3fe;
    border: 1px solid #cdcdcd;
    border-radius: 5px;
    padding: 10px;
}
.update-card {
    border-radius: 10px;
    border: 1px solid gray;
    padding: 10px;
    margin: 10px 0;
}
.update-card-caption {
    font-weight: bold;
}
.update-card-caption.ignored {
    text-decoration: line-through;
}
.update-card-content {
    margin: 5px 0;
    word-break: break-all;
    white-space: pre-wrap;
}
.update-card-buttons {
    text-align: right;
}
.update-card-row {
    margin: 5px 0;
}
.update-card-secondary {
    color: gray; font-size: small;
}
#iav_items > .update-card:nth-child(1) {
    margin-top: 0;
}
#iav_items > .update-card:nth-last-child(1) {
    margin-bottom: 0;
}
</style>

<fieldset>
    <legend>${tr('autoupdate')}</legend>
    <div id="autoupdate_config">
        <div><label>
            <span>${tr('cfgau')} </span>
            <select id="cfgau"></select>
            <span id="cfgaut"></span>
        </label></div>

        <div id="cfgctime_wrapper" style="margin-top:15px"><label>
            <span>${tr('cfgctime')} </span>
            <input id="cfgctime" type=number min=1 max=31104000 value=86400>
        </label></div>
    </div>
    <div style="margin-top: 10px" class="infobox" id="settingsChangedTips" hidden>${tr('needReloadToApply')} <a href="javascript:" data-action=reload>${tr('reloadNow')}</a></div>
</fieldset>

<fieldset>
    <legend>${tr('checkupdate')}</legend>
    <div>
        <div style="margin-bottom: 10px;">[<a href="javascript:" id="checkNow">${tr('checkNow')}</a>]</div>
        <div style="font-family: monospace; font-size: small; color: gray">${tr('updlastctime')}: <span id="lastCheck"></span></div>
        <p class="update-widget text-tip" id=noUpdates>${tr('noUpdate')}</p>
        <p class="update-widget text-tip" id=checkingUpdates>${tr('checkingUpdates')}</p>
        <p class="update-widget text-tip" id=failedToCheckUpdates>${tr('failedToCheckUpdates')}</p>
        <p class="update-widget text-tip" id=willUpdateAtNextLoad>${tr('willUpdateAtNextLoad')}</p>
        <div class="update-widget" id=updates style="margin-top:12px">
            <div id=updates_count></div>
            <div class=updates-container > .update-card></div>
            <div class=opts>
                <a href="javascript:" id="updateAll">${tr('updateAll')}</a><span
                > | </span><a href="javascript:" id="ignoreAll">${tr('ignoreAll')}</a><span
                > | </span><a href="javascript:" id="clearAll">${tr('clearAll')}</a>
            </div>
        </div>
    </div>
</fieldset>

<fieldset>
    <legend>${tr('installanotherversion')}</legend>
    <div style="display: grid; place-items: center;">
        <a href="javascript:" id=iav_choose>${tr('iav_choose')}</a>
    </div>
    <dialog id=iav_container>
        <div>${tr('iav_pleasechoose')}&nbsp;<a href="javascript:" style="font-family: monospace; color: gray; margin-left: 2em" id=iav_load>${tr('iav_load')}</a></div>
        <div id=iav_items></div>
        <div style="text-align: right">
            <a href="javascript:" id=iav_apply>${tr('iav_apply')}</a><span>&nbsp; &nbsp;</span><a href="javascript:" id=iav_cancel>${tr('iav_cancel')}</a>
        </div>
    </dialog>
</fieldset>

</div>`;

export const updateManager_defaultOptions = {
    getConfig() {
        try {
            return JSON.parse(localStorage.getItem('update manager options'));
        } catch { return {} }
    },
    setConfig(newConfig) {
        try {
            return localStorage.setItem('update manager options', JSON.stringify(newConfig));
        } catch {
            return localStorage.setItem('update manager options', '{}');
        }
    },
    getCurrentVersion() {
        return '1.1.1.1';
    },
    // doUpdate(targetVersion, noUI) { },
};


export class UpdateManager {
    #el = null;
    #inited = false;
    #getConfigPtr = null;
    #setConfigPtr = null;
    #config = {};
    #initPromise = null;
    #crinfo = {};
    #hasPendingUpdates = false;

    constructor({
        getConfig = updateManager_defaultOptions.getConfig,
        setConfig = updateManager_defaultOptions.setConfig,
        getCurrentVersion = updateManager_defaultOptions.getCurrentVersion,
        // versionPath = 'version',
        // releaseNotesPath = 'release-notes/[[version]].txt',
        // doUpdate = updateManager_defaultOptions.doUpdate,
        versionIndex = 'versions.json',
        updater = function (a, b) { return commonUpdater.call(this, 'Your Cache Name', a, b) },
    }) {
        this.#getConfigPtr = getConfig;
        this.#setConfigPtr = setConfig;
        Object.assign(this.#crinfo, {
            getCurrentVersion,
            // versionPath, releaseNotesPath, doUpdate,
            versionIndex, updater,
        });

        this.#el = document.createElement('div');
        this.#initPromise = this.#init();
        this.#initPromise.then(() => this.checkIf()).catch(error => { throw error });

    }

    async #init() {
        const shadowRoot = this.#el.attachShadow({ mode: 'open' });
        shadowRoot.append(updateManager_content.content.cloneNode(true));

        let retCfg = this.#getConfigPtr.call(this);
        if (retCfg instanceof Promise) retCfg = await retCfg;
        this.#config = retCfg;

        shadowRoot.querySelectorAll('[data-action=reload]').forEach(el => el.onclick = () => location.reload());

        const cfgau = shadowRoot.getElementById('cfgau');
        const cfgaut = shadowRoot.getElementById('cfgaut');
        const auopt_list = tr('auopt_list');
        let aucfg = await this.getConfig('configuration');
        if (aucfg == undefined) {
            await this.setConfig('configuration', defaultUpdateOption);
            aucfg = defaultUpdateOption;
        }
        for (const i of availableUpdateOptions) {
            const el = document.createElement('option');
            const value = typeof i === 'object' ? i.id : i;
            el.value = value;
            el.append(`${value} - ${auopt_list[String(value)]}`);
            if (value == aucfg) el.selected = true;
            if ((typeof i === 'object') && (i.disabled)) el.disabled = true;
            cfgau.append(el);
        }
        cfgaut.innerText = aucfg;
        cfgau.onchange = async () => {
            cfgaut.innerText = cfgau.value;
            await this.setConfig('configuration', +cfgau.value);
            shadowRoot.getElementById('settingsChangedTips').hidden = false;
            if (await this.allowAutoUpdate) {
                cfgctime_wrapper.hidden = false;
            } else cfgctime_wrapper.hidden = true;
        };
        cfgaut.onclick = () => cfgau.focus();
        
        const cfgctime = shadowRoot.getElementById('cfgctime');
        const cfgctime_wrapper = shadowRoot.getElementById('cfgctime_wrapper');
        if (!(await this.allowAutoUpdate)) {
            cfgctime_wrapper.hidden = true;
        } {
            const period = await this.getConfig('check period');
            if (undefined == period) await this.setConfig('check period', 86400);
            else cfgctime.value = period;
        };
        cfgctime.onchange = async () => {
            if (!cfgctime.checkValidity()) return;
            await this.setConfig('check period', cfgctime.value);
            shadowRoot.getElementById('settingsChangedTips').hidden = false;
        }

        shadowRoot.getElementById('checkNow').onclick = () => {
            if (this.#isChecking) return;
            queueMicrotask(() => this.check());
        };
        shadowRoot.getElementById('updateAll').onclick = () => {
            this.#doUpdate(null);
        };
        shadowRoot.getElementById('ignoreAll').onclick = async () => {
            const ignored = await this.getConfig('ignored versions') || [];
            for (const i of shadowRoot.querySelectorAll('#updates .updates-container > .update-card')) {
                if (!ignored.includes(i.$ID)) ignored.push(i.$ID);
                const caption = i.querySelector('.update-card-caption');
                caption && caption.classList.add('ignored');
            }
            await this.setConfig('ignored versions', ignored);
        };
        shadowRoot.getElementById('clearAll').onclick = () => {
            const updatesc = this.#el.shadowRoot.querySelector('#updates > .updates-container');
            updatesc.innerHTML = '';
            this.#updateCheckStatus('noUpdates');
        };

        const iavc = shadowRoot.getElementById('iav_container');
        let iav_loaded = false;
        shadowRoot.getElementById('iav_choose').onclick = () => {
            if (!iav_loaded) {
                iav_loaded = true;
                queueMicrotask(() => this.loadVersionsList());
            }
            iavc.showModal();
        };
        shadowRoot.getElementById('iav_cancel').onclick = () => {
            iavc.close();
        };
        shadowRoot.getElementById('iav_load').onclick = () => {
            queueMicrotask(() => this.loadVersionsList());
        };
        const items = shadowRoot.getElementById('iav_items');
        shadowRoot.getElementById('iav_apply').onclick = () => {
            const checked = items.querySelector('input:checked');
            const id = checked?.parentElement?.parentElement?.parentElement?.$ID;
            if (!checked || !id) return iavc.close();
            iavc.inert = true;
            this.#doUpdate(id);
        };
        items.addEventListener('change', ev => {
            if ('input' !== ev.target?.tagName?.toLowerCase?.()) return;
            const checked = items.querySelector('input:checked');
            if (checked) {
                for (const i of items.querySelectorAll('input:not(:checked)')) i.disabled = true;
            } else {
                for (const i of items.querySelectorAll('input:disabled')) i.disabled = false;
            }
        }, { capture: true });

        shadowRoot.getElementById('lastCheck').innerText = new Date(await this.getConfig('Last Check Time') || 0).toLocaleString();
        this.#updateCheckStatus('noUpdates');

        const period = Math.min(Math.max(await this.getConfig('check period') * 1000, updateCheckingDelayLimits.min), updateCheckingDelayLimits.max);
        if ((!isNaN(period))) setInterval(() => this.checkIf(), period);


        this.#inited = true;
    }

    async getConfig(key) {
        return Reflect.get(this.#config, key);
    }
    async setConfig(key, value, doNotSave = false) {
        const ret = Reflect.set(this.#config, key, value);
        if (!doNotSave) await this.saveConfig();
        return ret;
    }
    async delConfig(key, doNotSave = false) {
        const ret = Reflect.deleteProperty(this.#config, key);
        if (!doNotSave) await this.saveConfig();
        return ret;
    }
    async saveConfig() {
        const ret = this.#setConfigPtr.call(this, this.#config);
        if (ret instanceof Promise) return await ret;
        return ret;
    }

    getCrInfo(key) {
        return Reflect.get(this.#crinfo, key);
    }


    get allowAutoUpdate() {
        return (async () => {
            const cfg = await this.getConfig('configuration');
            return cfg >= 1 && cfg <= 4;
        })();
    }
    get isServiceWorkerEnabled() {
        if (!this.#inited) return this.#initPromise.then(() => {
            return this.getConfig('configuration')
        }).then(result => {
            return result != 6;
        });
        return this.getConfig('configuration') != 6;
    }


    attach(target) {
        if (!(target instanceof HTMLElement)) throw new TypeError('87');
        target.append(this.#el);
    }


    #isChecking = false;
    #isFirstFound = true;
    async check() {
        if (!navigator.onLine) return false;
        if (localStorage.getItem(updateProgKey)) return null;

        this.#isChecking = true;
        this.#updateCheckStatus('checkingUpdates');
        try {
            const resp = await fetch(this.#crinfo.versionIndex, { cache: 'no-store' });
            if (!resp.ok) throw resp;
            // const newVersion = await resp.text();
            const newData = await resp.json();
            if (!newData.versions || !newData.versions[0]) {
                this.#updateCheckStatus('noUpdates');
                this.#isChecking = false;
                return false;
            }
            const newVersion = newData.versions[0].id;
            const currentVersion = await (async () => {
                let temp1 = this.#crinfo.getCurrentVersion.call(this);
                return (temp1 instanceof Promise) ? await temp1 : temp1;
            })();

            this.setConfig('Last Check Time', new Date().getTime());
            this.#el.shadowRoot.querySelector('#lastCheck').innerText = new Date(await this.getConfig('Last Check Time') || 0).toLocaleString();

            if (newVersion === currentVersion) {
                this.#updateCheckStatus('noUpdates');
                this.#isChecking = false;
                return false;
            }

            this.#hasPendingUpdates = true;
            await this.setConfig('Last Check Time', 0);
            const updatesc = this.#el.shadowRoot.querySelector('#updates > .updates-container');
            updatesc.innerHTML = '';
            const ret = await this.#updateInfo(newData);
            const cfg = await this.getConfig('configuration');
            if (cfg == 2) {
                if (this.#isFirstFound) await this.#showUpdateTipUI(newData);
            }
            else if (cfg == 3) {
                this.#updateCheckStatus('willUpdateAtNextLoad');
                if (await this.getConfig('should update at next load'))
                    requestIdleCallback(() => this.#doUpdate(null, true), {
                        timeout: 5000,
                    });
                else await this.setConfig('should update at next load', true);
            }
            else if (cfg == 4) {
                requestIdleCallback(() => this.#doUpdate(null), {
                    timeout: 5000,
                });
            }
            this.#isChecking = false;
            this.#isFirstFound = false;
            return ret;
        }
        catch (error) {
            console.warn('[updater]', 'Failed to check for updates:', error);
            this.#updateCheckStatus('failedToCheckUpdates');
        }
        this.#isChecking = false;
    }

    async checkIf() {
        if (await this.allowAutoUpdate) {
            if (this.#hasPendingUpdates) return null;
            const period = await this.getConfig('check period') || 0;
            const lastTime = new Date(await this.getConfig('Last Check Time') || 0);
            const now = new Date();
            if ((now - lastTime) < (period * 1000)) return null;
            return await this.check();
        }
        else return null;
    }

    #updateCheckStatus(stat) {
        this.#el.shadowRoot.querySelectorAll('.update-widget').forEach(el => el.hidden = true);
        try {
            this.#el.shadowRoot.getElementById(stat).hidden = false;
        } catch {}
    }

    async #updateInfo(data) {
        const currentVersion = await (async () => {
            let temp1 = this.#crinfo.getCurrentVersion.call(this);
            return (temp1 instanceof Promise) ? await temp1 : temp1;
        })();
        for (let I = 0, L = Math.min(data.versions.length, 10); I < L; ++I) {
            if (!data.versions[I]) break;
            if (data.versions[I].id === currentVersion) break;
            const version = data.versions[I].ver;
            // const cfg = await this.getConfig('configuration');
            const updatesc = this.#el.shadowRoot.querySelector('#updates > .updates-container');
            this.#updateCheckStatus('updates');

            const el = document.createElement('div');
            el.className = 'update-card';
            el.$VERSION = version;
            el.$ID = data.versions[I].id;
            const ver = document.createElement('div');
            ver.className = 'update-card-caption';
            ver.innerText = version;
            el.append(ver);
            const ignored = await this.getConfig('ignored versions');
            let isIgnored = false;
            if (ignored) {
                if (ignored.includes(data.versions[I].id)) {
                    isIgnored = true;
                    ver.classList.add('ignored');
                }
            }
            const cont = document.createElement('div');
            cont.className = 'update-card-content';
            const btn_showRn = document.createElement('button');
            btn_showRn.type = 'button';
            btn_showRn.innerText = tr('showRn');
            btn_showRn.onclick = () => {
                btn_showRn.disabled = true;
                fetch(data.versions[I].releaseNotes, { cache: 'no-store' })
                .then(v => {
                    if (v.ok) return v.text();
                    throw new Error(`HTTP Error ${v.status} ${v.statusText}`);
                })
                .then(t => {
                    btn_showRn.replaceWith(document.createTextNode(t));
                })
                .catch(error => btn_showRn.replaceWith(document.createTextNode(`Failed to load Release Notes: ${error}`)));
            };
            cont.append(btn_showRn);
            el.append(cont);
            const btns = document.createElement('div');
            btns.className = 'update-card-buttons';
            const btn = [{
                text: tr('u:update'), click: () => {
                    this.#doUpdate(data.versions[I].id);
                }
            }, {
                id: 'ignore', text: tr('u:ignore'), click: async function (thisArg) {
                    const ignored = await thisArg.getConfig('ignored versions') || [];
                    if (!ignored.includes(data.versions[I].id)) ignored.push(data.versions[I].id);
                    await thisArg.setConfig('ignored versions', ignored);
                    ver.classList.add('ignored');
                    this.replaceWith(document.createTextNode('--'));
                }
            }, {
                text: tr('u:close'), click: () => {
                    el.remove();
                }
            },];
            for (let i = 0; i < btn.length; ++i) {
                const obj = btn[i];
                const a = document.createElement('a');
                a.href = 'javascript:';
                a.onclick = obj.click.bind(a, this);
                a.innerText = obj.text;
                btns.append(a);
                if (i + 1 !== btn.length) btns.append(' | ');

                if (isIgnored && obj.id === 'ignore') a.replaceWith(document.createTextNode('--'));
            }
            el.append(btns);
            updatesc.append(el);
        }
        return true;
    }
    async #showUpdateTipUI(data) {
        const version = data.versions[0].ver;

        const ignored = await this.getConfig('ignored versions');
        if (ignored) if (ignored.includes(data.versions[0].id)) return;

        const el = document.createElement('dialog');
        el.innerHTML = `
        <div style="font-weight: bold;">
            <span>${tr('newerVersionDetected')}</span>
        </div>

        <p data-id="version"></p>

        <div style="text-align: right">
            <a href="javascript:" data-id="u">${tr('u:update')}</a><span
            > | </span><a href="javascript:" data-id="s">${tr('u:see')}</a><span
            > | </span><a href="javascript:" data-id="c">${tr('u:close')}</a>
        </div>
        `;
        el.querySelector('[data-id=version]').innerText = version;
        el.querySelector('[data-id=u]').onclick = () => {
            queueMicrotask(() => this.#doUpdate(data.versions[0].id));
        };
        el.querySelector('[data-id=s]').onclick = () => {
            el.close();
            requestAnimationFrame(() => {
                el.remove();
                this.#el.scrollIntoView({ behavior: 'smooth' });
            });
        };
        el.querySelector('[data-id=c]').onclick = () => {
            el.close();
            requestAnimationFrame(() => {
                el.remove();
            });
        };
        el.addEventListener('cancel', () => {
            el.remove();
        });
        (document.body || document.documentElement).append(el);
        el.showModal();
    }

    async loadVersionsList() {
        const item = this.#el.shadowRoot.getElementById('iav_items');
        if (!item || item.dataset.loading) return;
        item.innerHTML = '';
        item.dataset.loading = true;

        try {
            const resp = await fetch(this.#crinfo.versionIndex, { cache: 'no-store' });
            if (!resp.ok) throw resp;
            // const newVersion = await resp.text();
            const newData = await resp.json();
            if (!newData.versions || !newData.versions[0]) {
                throw 0;
            }
            const currentVersion = await (async () => {
                let temp1 = this.#crinfo.getCurrentVersion.call(this);
                return (temp1 instanceof Promise) ? await temp1 : temp1;
            })();

            for (const i of newData.versions) {
                const el = document.createElement('div');
                el.$ID = i.id;
                el.className = 'update-card';
                const ver = document.createElement('div');
                ver.className = 'update-card-caption';
                const label = document.createElement('label');
                label.style.display = 'block';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.style.margin = '0';
                checkbox.style.marginRight = '0.5em';
                label.append(checkbox, i.ver);
                ver.append(label);
                el.append(ver);
                if (i.id === currentVersion) (checkbox.remove(), label.append(" (current)"), (label.style.textDecoration = 'line-through'));
                const cont = document.createElement('div');
                cont.className = 'update-card-content';
                const row1 = document.createElement('div'),
                    row2 = document.createElement('div'),
                    row3 = document.createElement('div');
                row1.className = row2.className = row3.className = 'update-card-secondary update-card-row';
                row1.innerText = i.id;
                row2.innerText = `Release Date: ${i.date}`;
                row3.innerText = `Description: ${i.description}`;
                cont.append(row1, row2, row3);
                const btn_showRn = document.createElement('button');
                btn_showRn.type = 'button';
                btn_showRn.innerText = tr('showRn');
                btn_showRn.onclick = () => {
                    btn_showRn.disabled = true;
                    fetch(i.releaseNotes, { cache: 'no-store' }).then(v => { if (v.ok) return v.text(); throw new Error(`HTTP Error ${v.status} ${v.statusText}`); })
                    .then(t => btn_showRn.replaceWith(document.createTextNode(t)))
                    .catch(error => btn_showRn.replaceWith(document.createTextNode(`Failed to load Release Notes: ${error}`)));
                };
                cont.append(btn_showRn);
                el.append(cont);
                item.append(el);
            }
    
        }
        finally {
            delete item.dataset.loading;
            
        }
    }

    async #doUpdate(targetVersion, noUI = false) {
        await this.setConfig('ignored versions', [], true);
        await this.delConfig('should update at next load', true);
        await this.saveConfig();
        const ret = this.#crinfo.updater.call(this, targetVersion, noUI);
        this.#hasPendingUpdates = false;
        return ret;
    }


};


export function delay(time = 0) {
    return new Promise(r => setTimeout(r, time));
}




export async function commonUpdater(cacheName, targetVersion, noUI) {
    const data = {
        cacheName,
        versionIndex: this.getCrInfo('versionIndex'),
        target: targetVersion,
        noUI,
    };
    localStorage.setItem(updateDataKey, JSON.stringify(data));
    localStorage.setItem(updateProgKey, '1');
    location.reload();
}
function commonUpdater_reset() {
    localStorage.removeItem(updateProgKey);
    localStorage.removeItem(updateDataKey);
}
async function commonUpdater_worker() {
    const prog = localStorage.getItem(updateProgKey);
    const data = (function () {
        try { return JSON.parse(localStorage.getItem(updateDataKey)); }
        catch { return null }
    })();
    if (!(prog && data)) return;

    document.documentElement.inert = true;

    //#region create UI
    const stat_text = document.createElement('div');
    stat_text.style.textAlign = 'center';
    stat_text.append(tr('p:prep'));
    const progbar_c = document.createElement('div');
    progbar_c.hidden = true;
    const progbar = document.createElement('progress');
    progbar.min = 0, progbar.max = 100, progbar.value = 0;
    const progtext = document.createElement('span');
    progtext.style.marginLeft = '0.5em';
    progbar_c.append(progbar, progtext);
    const cancel_button_container = document.createElement('div');
    cancel_button_container.hidden = true;
    cancel_button_container.style.marginTop = '10px';
    cancel_button_container.style.textAlign = 'right';
    const cancel_button = document.createElement('a');
    cancel_button.href = 'javascript:void(0)';
    cancel_button.append(tr('p:cancel'));
    cancel_button_container.append(cancel_button);
    const dlg = document.createElement('dialog');
    dlg.oncancel = () => false;
    dlg.append(stat_text, progbar_c, cancel_button_container);
    (document.body || document.documentElement).append(dlg);
    //#endregion
    const makeCancelable = (fn) => {
        cancel_button.onclick = fn;
        cancel_button_container.hidden = false;
    };
    const updateStat = (text) => stat_text.innerText = text;
    const initProg = (min, max) => (progbar_c.hidden = false, progbar.min = min, progbar.max = max);
    const updateProg = (prog, text) => (progbar.value = prog, progtext.innerText = text);
    const setState = state => localStorage.setItem(updateProgKey, String(state));
    await delay(100);
    document.documentElement.inert = false;
    dlg.showModal();

    switch (prog) {
        case '1': {
            await delay(1000);
            makeCancelable(() => location.reload(commonUpdater_reset()));
            updateStat(tr('p:computingFilesToDl'));
            try {
                if (!data.cacheName) throw new TypeError('Invalid data');
                const resp = await fetch(data.versionIndex, { cache: 'no-store' });
                if (!resp.ok) throw `HTTP Error ${resp.status}: ${resp.statusText}`;
                const json = await resp.json();
                if (!json.versions || !Array.isArray(json.versions) || json.versions.length < 1) throw new Error('Invalid data');
                let targetIndex = -1;
                if (data.target == null) targetIndex = 0;
                else for (let i = 0, l = json.versions.length; i < l; ++i){
                    if (json.versions[i].id === data.target) {
                        targetIndex = i; break;
                    }
                }
                if (targetIndex < 0) throw new Error('target version not found. Is it deleted from the server?');
                data.fullUpgradeData = json;
                data.targetIndex = targetIndex;
                await delay(500);
                {
                    let filesToDl = {};
                    const res = json.versions[targetIndex].resources;
                    let base = res.base || location.origin + location.pathname.substring(0, location.pathname.lastIndexOf('/') + 1);
                    if (!base.endsWith('/')) base += '/';
                    let url = base + res.manifest;
                    
                    const manifest = await (await fetch(url, { cache: 'no-store' })).json();
                    if (!Array.isArray(manifest)) throw new TypeError('Type Error');
                    for (const i of manifest) {
                        filesToDl[i] = base + i;
                    }
                    
                    data.filesToDl = filesToDl;
                }
                await delay(500);
                localStorage.setItem(updateDataKey, JSON.stringify(data));
                setState(2);
                location.reload();
            }
            catch (error) {
                updateStat(tr('p:error.failed$').replace('$1', error));
                commonUpdater_reset();
            }
        }
            break;
        
        case '2': {
            updateStat(tr('p:dlingres'));
            makeCancelable(() => location.reload(commonUpdater_reset()));
            
            let cache = null;
            try {
                cache = await caches.open(data.cacheName + '.tmp');
                {
                    const keys = await cache.keys();
                    for (const i of keys) {
                        await cache.delete(i);
                    }
                }
                // console.log(data.filesToDl);
                const keys = Reflect.ownKeys(data.filesToDl);
                const l = keys.length; let n = 0;
                data.filesToDl_count = l; localStorage.setItem(updateDataKey, JSON.stringify(data));
                const base = location.origin + location.pathname.substring(0, location.pathname.lastIndexOf('/') + 1);
                initProg(0, l);
                updateProg(0, `0 / ${l}`);
                for (const i of keys) {
                    const resp = await fetch(data.filesToDl[i], { cache: 'no-store' });
                    if (!resp.ok) throw `HTTP Error ${resp.status}: ${resp.statusText}`;
                    cache.put(new Request(base + (i === 'index.html' ? '' : i)), resp);

                    updateProg(++n, `${n} / ${l}`);
                }
                await delay(500);
                setState(3);
                setTimeout(() => (dlg.close(), commonUpdater_worker()), (1000));
            }
            catch (error) {
                updateStat(tr('p:error.failed$').replace('$1', error));
                commonUpdater_reset();
            }
        }
            break;
        
        case '3': {
            updateStat(tr('p:ckingres'));
            makeCancelable(() => location.reload(commonUpdater_reset()));

            initProg(0, data.filesToDl_count);
            updateProg(0, '0.00%');
            for (let i = 0; i < data.filesToDl_count; ++i){
                await delay(200);
                updateProg(i + 1, Math.floor(((i + 1) / data.filesToDl_count) * 10000) / 100 + '%');
            }
        
            await delay(500);
            setState(4);
            location.reload();
        }
            break;
        
        case '4': {
            updateStat(tr('p:applying'));
            initProg(0, 0);
            progbar.removeAttribute('value');

            // TODO: eval before-update hook

            await delay(500);
            setState(5);
            location.reload();
            
        }
            break;
        
        case '5': {
            updateStat(tr('p:applying'));

            // for (let i = 0; i < data.filesToDl_count; ++i){
            //     await delay(200);
            //     updateProg(i + 1, Math.floor(((i + 1) / data.filesToDl_count) * 10000) / 100 + '%');
            // }
            
            let cache = null, cache2 = null;
            try {
                cache = await caches.open(data.cacheName + '.tmp');
                cache2 = await caches.open(data.cacheName);

                let n = 0, total = data.filesToDl_count + 1;
                initProg(0, total);
                updateProg(0, '0.00%');
                {
                    const keys = await cache2.keys();
                    for (const i of keys) {
                        await cache2.delete(i);
                    }
                }
                updateProg(++n, Math.floor(((n) / total) * 10000) / 100 + '%');
                
                // const base = location.origin + location.pathname.substring(0, location.pathname.lastIndexOf('/') + 1);
                for (const i of await cache.keys()) {
                    const resp = await cache.match(i);
                    if (!resp) continue;
                    await cache2.put(i, resp);

                    updateProg(++n, Math.floor(((n) / total) * 10000) / 100 + '%');
                }
                await delay(1000);
                setState(6);
                location.reload();
            }
            catch (error) {
                updateStat(tr('p:rollbacking'));
                try {
                    await caches.delete(data.cacheName + '.tmp');
                    commonUpdater_reset();
                    
                    await delay(1000);

                    updateStat(tr('p:error.failed$').replace('$1', error));
                    makeCancelable(() => location.reload());
                }
                catch (error) {
                    updateStat(tr('p:error.fatalfailed$').replace('$1', error));
                    commonUpdater_reset();
                }
            }
            
        }
            break;
        
        case '6': {
            updateStat(tr('p:applying'));
            initProg(0, 0);
            progbar.removeAttribute('value');

            // TODO: eval after-update hook

            await delay(500);
            setState(7);
            location.reload();
            
        }
            break;
        
        case '7': {
            updateStat(tr('p:applying'));
            initProg(0, 0);
            progbar.removeAttribute('value');

            try {
                await caches.delete(data.cacheName + '.tmp');
            }
            catch (error) {
                updateStat(tr('p:error.fatalfailed$').replace('$1', error));
                commonUpdater_reset();
            }
            
            setState(8);
            location.reload();
        }
            break;
        
        case '8': {
            updateStat(tr('p:applying'));
            initProg(0, 0);
            progbar.removeAttribute('value');

            await new Promise(r => requestIdleCallback(r, { timeout: 10000 }));
            setState(9);
            location.reload();
        }
            break;
        
        case '9': {
            updateStat(tr('p:checking'));
            await new Promise(r => requestIdleCallback(r, { timeout: 5000 }));
            setState(10);
            location.reload();
        }
            break;
        case '10': {
            updateStat(tr('p:checking'));
            await new Promise(r => setTimeout(r, 1000));
            setState(11);
            location.reload();
        }
            break;
        case '11': {
            updateStat(tr('p:checking'));
            await new Promise(r => requestIdleCallback(r, { timeout: 10000 }));
            setState(12);
            location.reload();
        }
            break;
        case '12': {
            updateStat(tr('p:finishing'));
            await new Promise(r => requestIdleCallback(r, { timeout: 1000 }));
            setState(13);
            location.reload();
        }
            break;
        
        case '13': {
            updateStat(tr('p:finishing'));
            await delay(500);
            commonUpdater_reset();
            location.reload();
        }
            break;
    
        default:
            dlg.innerText = tr('p:error.invalidstat');
            setTimeout(() => {
                commonUpdater_reset();
                location.reload();
            }, 3000);
            break;
    }
}
requestIdleCallback(commonUpdater_worker, { timeout: 100 });



