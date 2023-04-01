// main.js


import './sw_env.js';

import { delay, wrapQueryElement, showTip } from './util.js';
import { clearCache, UpdateManager, commonUpdater } from './lib/updater/updater.js';


const app = document.getElementById('app');
if (!app) throw new Error('#app not found');
const $ = wrapQueryElement(app);



//#region open db
$('.loading-mask').innerHTML = '正在加载版本';
let currentVersion = null;
{
    const cachedVersion = await caches.match('./version');
    if (cachedVersion) {
        $('#versionText').innerText = currentVersion = await cachedVersion.text();
    }
    else fetch('version', { cache: 'no-store' }).then(v => {
        if (!v.ok) throw new Error(`${v.status} ${v.statusText}`);
        return v.text();
    })
    .then(v => $('#versionText').innerText = currentVersion = v)
    .catch(e => $('#versionText').innerText = `Failed: ${e}`);
}


$('.loading-mask').innerHTML = '正在处理数据库';
const { db_name } = await import('./userdata.js');

$('#deleteDB').on('click', async function () {
    userdata.close();
    indexedDB.deleteDatabase(db_name).onsuccess = () => {
        if (confirm('数据库已删除。\n您想现在刷新页面吗？'))
            location.reload();
        else $('#deleteDB').parentElement.close();
    }
});
$('#deleteDB_databaseName').innerText = $('#dbName').innerText = db_name;

//#endregion


//#region update manager
$('.loading-mask').innerHTML = '正在检查更新';
const updateManager = new UpdateManager({
    async getConfig() {
        return (await userdata.get('config', 'update config')) || {};
    },
    async setConfig(cfg) {
        return await userdata.put('config', cfg, 'update config');
    },
    getCurrentVersion() {
        return currentVersion;
    },
    // versionPath: './version',
    // async doUpdate(targetVersion, doNotApply) {
    //     if (!doNotApply) $('#updateAllResources').previousElementSibling.showModal();
    //     await delay();
    //     try {
    //         await clearCache(globalThis.sw_env.cacheName);
    //         if (!doNotApply) setTimeout(() => location.reload(), 1000);
    //     } catch (error) {
    //         if (!doNotApply) $('#updateAllResources').previousElementSibling.close();
    //         showTip(`更新失败: ${error}`);
    //     }
    // },
    versionIndex: 'versions/index.json',
    updater: function (a, b) { return commonUpdater.call(this, globalThis.sw_env.cacheName, a, b) },
});
updateManager.attach($('#updateManagerContainer'));

let isServiceWorkerEnabled = updateManager.isServiceWorkerEnabled;
if (isServiceWorkerEnabled instanceof Promise) isServiceWorkerEnabled = await isServiceWorkerEnabled;

if (Reflect.has(globalThis, 'swAlive')) {
    if (!isServiceWorkerEnabled) {
        navigator.serviceWorker.getRegistration('./').then(sw => {
            sw.unregister().then(result => {
                if (result) location.reload();
            });
        });
    }
} else if (isServiceWorkerEnabled) {
    if (navigator.serviceWorker) {
        navigator.serviceWorker.register('./sw.js');
    }
}

//#endregion


//#region data
$('.loading-mask').innerHTML = '正在处理数据';
for (let i = 0; i < 20; ++i){
    const open = (ev) => {
        const url = 'record.html?id=' + 'rec' + i
        const blank = ev ? ((ev instanceof MouseEvent) ? (ev.button === 1) : (('ctrlKey' in ev) ? (ev.ctrlKey) : false)) : false;
        Reflect[blank ? 'apply' : 'set'](blank ? window.open : window, blank ? window : 'location', blank ? [url, '_blank'] : url);
    };
    const el = document.createElement('div');
    el.className = 'app-data-objectstore-card', el.tabIndex = 0, el.role = 'button';
    const nameText = document.createElement('b'), nameEdit = document.createElement('input');
    let objectStoreName = {
        _ref: null,
        get ref() { return this._ref },
        set ref(value) {
            this._ref = value;
            nameText.innerText = nameEdit.value = value;
            return true;
        }
    };
    try {
        const data = await userdata.get('rinfo', 'rec' + i)/* || {}*/;
        // if the data doesn't exists
        // access data.name will cause an error
        // so that we can use the default value
        objectStoreName.ref = data.name;
    }
    catch { objectStoreName.ref = i; }

    const nameContainer = document.createElement('div');
    nameContainer.className = 'app-data-objectstore-name';
    const toggle = () => [nameText.style.display, nameEdit.style.display] = [nameEdit.style.display, nameText.style.display];
    nameEdit.style.display = 'none';
    nameEdit.maxLength = 128;
    nameEdit.onclick = ev => ev.stopPropagation();
    nameEdit.onchange = async function () {
        try {
            if (!nameEdit.value) throw '名称不能为空';
            const oldData = await userdata.get('rinfo', 'rec' + i) || {};
            const newData = structuredClone(oldData);
            newData.name = nameEdit.value;
            await userdata.put('rinfo', newData, 'rec' + i);
            objectStoreName.ref = newData.name;
        } catch (error) { showTip('保存失败: ' + error) }
    }
    nameEdit.onblur = toggle;
    nameContainer.append(nameText, nameEdit);
    el.append(nameContainer);
    nameText.innerText = objectStoreName.ref;

    const details = document.createElement('p');
    details.className = 'app-data-objectstore-details';
    details.innerHTML = `<!--
    --><div>内部名称: <span>${'rec' + i}</span></div><!--
    -->`;
    el.append(details);

    const options = document.createElement('div');
    options.className = 'app-data-objectstore-options';
    const option1 = document.createElement('a');
    option1.innerText = '编辑名称';
    option1.href = 'javascript://app/record/item/edit';
    option1.onclick = (ev) => {
        ev.stopPropagation();
        toggle();
        nameEdit.focus();
    };
    options.append(option1);
    el.append(options);

    el.addEventListener('click', function (ev) { open(ev) });
    el.addEventListener('mousedown', function (ev) { ev.button === 1 && open(ev) });
    el.addEventListener('keyup', function (ev) { ev.target === this && ev.key === 'Enter' && open(ev) });

    $('.app-records-container').append(el);
}
//#endregion


//#region persist
$('.loading-mask').innerHTML = '正在处理 persist';
const checkPersistStatus = function () {
    $('#persistStatus').innerText = 'Loading persist status';
    $('#persistStatus').style.color = 'black';
    try {
        navigator.storage.persisted().then((v) => {
            $('#persistStatus').innerText = v ? 'persisted' : 'not persisted';
            $('#persistStatus').style.color = v ? 'green' : 'red';
        });
    }
    catch {
        $('#persistStatus').innerText = 'not supported';
    }
};
queueMicrotask(() => checkPersistStatus());
$('#persistStatus').on('click', checkPersistStatus);
$('#doPersist').on('click', () => {
    if (!navigator.storage.persist) {
        $('#doPersist').innerText = 'not supported';
    } else {
        $('#persistStatus').innerText = 'Requesting permission';
        $('#persistStatus').style.color = 'black';
        navigator.storage.persist().then((v) => {
            if (!v) {
                $('#persistStatus').innerText = 'disallowed';
                $('#persistStatus').style.color = 'red';
            } else checkPersistStatus();
        });
    }
});
//#endregion


//#region data usage
$('.loading-mask').innerHTML = '正在加载数据用量情况';
try {
    const est = await navigator.storage.estimate();
    if (!est) throw 1;

    $('#data_estimate_usage').innerText = est.usage;
    $('#data_estimate_quota').innerText = est.quota;
} catch { }
//#endregion




$('.loading-mask').innerHTML = '正在完成';
await delay((Math.floor(Math.random() * 1000)));
$().classList.remove('is-loading');




