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
    const el = document.createElement('div');
    el.className = 'app-data-objectstore-card';
    const el1 = document.createElement('div');
    el1.append('名称: ');
    const ipt1 = document.createElement('input');
    ipt1.maxLength = 128;
    try {
        const data = await userdata.get('rinfo', 'rec' + i)/* || {}*/;
        // if the data doesn't exists
        // access data.name will cause an error
        // so that we can use the default value
        ipt1.value = data.name;
    }
    catch { ipt1.value = i; }
    ipt1.onchange = async function () {
        try {
            if (!ipt1.value) throw '名称不能为空';
            const oldData = await userdata.get('rinfo', 'rec' + i) || {};
            const newData = structuredClone(oldData);
            newData.name = ipt1.value;
            await userdata.put('rinfo', newData, 'rec' + i);
        } catch (error) { showTip('保存失败: ' + error) }
    };
    el1.append(ipt1);
    el.append(el1);
    const el2 = document.createElement('div');
    el2.innerText = '内部名称: ' + 'rec' + i;
    el.append(el2);
    const el3 = document.createElement('div');
    el3.append('操作: ');
    const btn1 = document.createElement('button');
    btn1.append('打开');
    btn1.onclick = function () {
        location = 'record.html?id=' + 'rec' + i;
    };
    el3.append(btn1);
    el.append(el3);
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




