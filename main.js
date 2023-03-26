// main.js


import './sw_env.js';

import { delay, wrapQueryElement, showTip } from './util.js';
import { clearCache } from './lib/updater/updater.js';


const app = document.getElementById('app');
if (!app) throw new Error('#app not found');
const $ = wrapQueryElement(app);


const pager_pageSize = 50;


//#region open db

$('#hback').on('click', function () {
    let type = 1;
    if ('navigation' in globalThis && 'canGoBack' in globalThis.navigation) {
        if (!navigation.canGoBack) type = 0;
    } else {
        if (history.length < 1) type = 0;
    }
    (type === 1) ? (history.back()) : (location = './');
});


$('.loading-mask').innerHTML = '正在处理数据库';
const { db_name } = await import('./userdata.js');

const pageURL = new URL(location.href);
const rec = pageURL.searchParams.get('id');
if (!rec) {
    $('.loading-mask').innerHTML = '参数错误。';
    throw new Error('Invalid paramater');
}
try {
    await userdata.transaction(rec, 'readwrite');
    await new Promise(resolve => queueMicrotask(resolve));

    const info = await userdata.get('rinfo', rec);
    if (info) {
        $('#recordName').innerText = document.title = info.name;
    }
} catch (error) {
    $('.loading-mask').innerHTML = '数据库错误: ' + error;
    throw error;
}

//#endregion



//#region register event handlers
$('.loading-mask').innerHTML = '正在加载分页组件';
await import('./lib/pager/pager.js');


$('.loading-mask').innerHTML = '正在注册事件处理程序';

{
    let lastAppPagerCursor = -1;
    $('#appRecordsPager').on('change', function () {
        if ($('#appRecordsPager').value === lastAppPagerCursor) return;
        lastAppPagerCursor = $('#appRecordsPager').value;
        data_Load((lastAppPagerCursor - 1) * pager_pageSize);
    });
}
let export_cache = null, export_cache_url = null, export_cache_dfname = null;
$('#clearExportArea').on('click', () => {
    URL.revokeObjectURL(export_cache_url);
    $('#data_export_result').value = '', export_cache = export_cache_url = export_cache_dfname = null;
});
$('#clearImportArea').on('click', () => { $('#data_import').value = '' });
$('#dlExported').on('click', () => {
    if (!export_cache_url) return showTip('请先进行导出。');
    const a = document.createElement('a');
    a.href = export_cache_url;
    (export_cache_dfname) && (a.download = export_cache_dfname);
    a.target = '_blank';
    a.innerHTML = 'Click to Download';
    document.body.append(a);
    a.click();
    a.remove();
});

$('.loading-mask').innerHTML = '正在注册事件处理程序 >> 正在载入: 导入/导出 处理程序';
const { formatters, parsers, formatters_poster } = await import('./dataImportAndExport.js');
$('#exportData').on('click', async function () {
    const formatter = formatters[$('#data_export_format').value];
    if (!formatter) return showTip('Error: 找不到formatter');

    let ret = new Array();
    const data_max = 100_0000;

    let tx = userdata.transaction(rec);
    let cursor = await tx.store.openCursor(undefined, 'prev'), n = 0;

    while (cursor && (n++ < data_max)) {
        // console.log(cursor.key, cursor.value);
        ret.push(formatter(cursor.value));
        cursor = await cursor.continue();
    }

    const poster = formatters_poster[$('#data_export_format').value];
    if (poster) {
        ret = poster(ret, value => export_cache_dfname = value);
    }

    export_cache = new Blob(ret, { type: 'application/octet-stream' });
    if (export_cache.size < 16384) {
        // 可以安全地显示为文本
        const text = await export_cache.text();

        $('#data_export_result').value = text;

    } else {
        $('#data_export_result').value = '内容过大，请点击下载';
    }
    export_cache_url = URL.createObjectURL(export_cache);
});
$('#importData').on('click', async function () {
    const parser = parsers[$('#data_import_format').value];
    if (!parser) return showTip('Error: 找不到parser');
    
    let datastr;
    if ($('#data_import_f').files.length) {
        const file = $('#data_import_f').files[0];
        datastr = await file.text();
    }
    else datastr = data_import.value;
    
    $('#importData').disabled = $('#clearImportArea').disabled = true;

    const data = datastr.split('\n');
    for (const i of data) {
        await userdata.put(rec, parser(i.replaceAll('\r', ''), data_computeId));
    }


    $('#importData').disabled = $('#clearImportArea').disabled = false;
    $('#appRecordsPager').value = 1;
    data_Load();
});

//#endregion


//#region open db
$('.loading-mask').innerHTML = '正在处理数据';
const data_updatePager = async function () {
    let count = await userdata.count(rec);
    // const pages = Math.max(1, Math.floor(count / pager_pageSize));
    $('#appRecordsPager').count = count,
    $('#appRecordsPager').pageSize = pager_pageSize;
    
};
const data_delete = async function (id) {
    if (typeof id === 'object') id = id.id;
    await userdata.delete(rec, id);
    await data_updatePager();
    data_Load(($('#appRecordsPager').value - 1) * pager_pageSize);
};
const data_computeId = function (obj) {
    const date = (obj.date || '1-1-1').split('-');
    const time = (obj.time || '0:0:0').split(':');
    const dd = new Date(0);
    dd.setFullYear(parseInt(date[0]), parseInt(date[1]) - 1, parseInt(date[2]));
    dd.setHours(parseInt(time[0]), parseInt(time[1]), parseInt(time[2] || '0' /* for some browsers who doesn't support [step] attr */), 0);
    return dd.getTime();
};
const data_addRow = async function (obj, shouldPrepend = false) {
    const tr1 = document.createElement('tr'), td = [],
        a1 = document.createElement('a');
    for (let i = 0; i < 4; ++i) td.push(document.createElement('td'));
    tr1._$$data = obj;
    tr1.className = 'is-record user-data';
    tr1.dataset.dataId = obj.id;
    td[0].dataset.keyPath = 'value';
    td[1].dataset.keyPath = 'date';
    td[2].dataset.keyPath = 'time';
    for (let i = 0, l = td.length; i < l; ++i) td[i].innerText = String(obj[td[i].dataset.keyPath] || '');
    for (let i = 0; i < 3; ++i) td[i].tabIndex = 0;
    a1.href = 'javascript:';
    a1.innerText = '删除';
    a1.dataset.action = 'delete';
    td[3].append(a1);
    tr1.append.apply(tr1, td);
    const node1 = $('#records tbody').querySelector(`[data-data-id="${obj.id}"]`);
    if (node1) node1.replaceWith(tr1);
    else $('#records tbody')[shouldPrepend ? 'prepend' : 'append'](tr1);

    if ($('#records tbody').childElementCount > pager_pageSize) $('#records tbody').lastElementChild.remove();
    await data_updatePager();
};
const fillZero = function (x, len = 1) {
    if (typeof x !== 'string') x = String(x);
    if (x.length < len) x = '0'.repeat(len - x.length) + x;
    return x;
};
const data_Add = async function () {
    const ipt = $('.app-records-header .user-input input');
    if (!ipt.value) return;
    const now = new Date();
    now.setMilliseconds(0); // normalize
    const date = `${fillZero(now.getFullYear(),4)}-${fillZero(now.getMonth()+1,2)}-${fillZero(now.getDate(),2)}`;
    const time = `${fillZero(now.getHours(),2)}:${fillZero(now.getMinutes(),2)}:${fillZero(now.getSeconds(),2)}`;
    const obj = {
        id: now.getTime(),
        date, time,
        value: ipt.value,
    };
    await userdata.put(rec, obj);
    ipt.value = '';
    if ($('#appRecordsPager').value !== 1)
        $('#appRecordsPager').value = 1;
    else await data_addRow(obj, true);
};

{
    const tr1 = document.createElement('tr');
    const td = document.createElement('td');
    const ipt = document.createElement('input');
    ipt.onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); data_Add() } }
    ipt.onblur = () => { data_Add() };
    ipt.type = 'text';
    ipt.ariaLabel = '创建新记录';
    td.className = 'user-input';
    td.append(ipt);
    tr1.append(td);
    for (const i of ('\u2060'.repeat(3)))tr1.append(document.createElement('td'));
    $('.app-records-header tbody').prepend(tr1);
}

$('.loading-mask').innerHTML = '正在处理数据 >> 正在注册事件处理程序';
$('#records').on('click', function (ev) {
    if (ev.target.tagName.toUpperCase() !== 'A') return;

    switch (ev.target.dataset.action) {
        case 'delete':
            data_delete(ev.target.parentElement.parentElement._$$data).then(() => {
                ev.target.parentElement.parentElement.remove();
            }).catch(error => { console.error(error) });
            break;
    
        default:;
    }
});
$('#records').on('click', function (ev) {
    const target = ev.target;
    if (!target || target.tagName.toUpperCase() !== 'TD' ||
        !target.parentElement.classList.contains('user-data')) return;

    switch (target.dataset.keyPath) {
        case undefined:
            break;

        case 'date':
        case 'time':
        {
            target.classList.add('user-input');
            target.innerHTML = '';
            const ipt = document.createElement('input');
            ipt.type = target.dataset.keyPath;
            ipt.value = String(target.parentElement._$$data[target.dataset.keyPath]);
            target.dataset.keyPath === 'time' && (ipt.step = 1);
            const r = async () => {
                const newData = structuredClone(target.parentElement._$$data);
                try {
                    await data_delete(newData.id);
                    newData[target.dataset.keyPath] = ipt.value;
                    newData.id = data_computeId(newData);
                    await userdata.put(rec, newData);
                    // target.parentElement._$$data = structuredClone(newData);
                    await data_Load(($('#appRecordsPager').value - 1) * pager_pageSize);
                }
                catch (error) {
                    console.error(error);
                    ipt.replaceWith(document.createTextNode(String(target.parentElement._$$data[target.dataset.keyPath])));
                }
            };
            ipt.onblur = () => r();
            target.append(ipt);
            ipt.focus();
        }
            break;
    
        default: {
            target.classList.add('user-input');
            target.innerHTML = '';
            const ipt = document.createElement('input');
            ipt.type = 'text';
            ipt.value = String(target.parentElement._$$data[target.dataset.keyPath]);
            const r = async () => {
                await new Promise(resolve => queueMicrotask(resolve));
                const newData = structuredClone(target.parentElement._$$data);
                try {
                    if (!ipt.value) throw new TypeError('the value is empty.');
                    await data_delete(newData.id);
                    newData[target.dataset.keyPath] = ipt.value;
                    await userdata.put(rec, newData);
                    // target.parentElement._$$data = structuredClone(newData);
                    // ipt.replaceWith(document.createTextNode(ipt.value));
                    await data_Load(($('#appRecordsPager').value - 1) * pager_pageSize);
                }
                catch (error) {
                    console.error(error);
                    showTip(String(error));
                    ipt.replaceWith(document.createTextNode(String(target.parentElement._$$data[target.dataset.keyPath])));
                }
            };
            ipt.onblur = () => r();
            ipt.onkeydown = ev => {
                if (ev.key === 'Enter') {
                    ev.preventDefault(); return ipt.blur();
                }
                if (ev.key === 'Escape') {
                    ipt.replaceWith(document.createTextNode(String(target.parentElement._$$data[target.dataset.keyPath])));
                    return;
                }
            };
            target.append(ipt);
            ipt.focus();
        }
    }
});
$('#records').on('keydown', function (ev) {
    const target = ev.target;
    if (ev.key !== 'Enter') return;
    if (!target || target.tagName.toUpperCase() !== 'TD' ||
        !target.parentElement.classList.contains('user-data')) return;
    target.dispatchEvent(new(PointerEvent || MouseEvent)('click', {
        bubbles: true, cancelable: true
    }));
});

$('.loading-mask').innerHTML = '正在处理数据 >> 正在加载数据';
let data_isLoading = false;
$('#appRecordsPager').on('beforechange', ev => {
    if (data_isLoading) ev.preventDefault();
});
const data_Load = async function (begin = 0) {
    data_isLoading = true;
    $('#records tbody').innerHTML = '';

    try {
        let tx = userdata.transaction(rec);
        let cursor = await tx.store.openCursor(undefined, 'prev'), n = 0;
        try {
            begin && (await cursor.advance(begin));
        } catch { n = pager_pageSize }
    
        while (cursor && (n++ < pager_pageSize)) {
            // console.log(cursor.key, cursor.value);
            data_addRow(cursor.value);
            try { cursor = await cursor.continue(); }
            catch { break; }
        }
    } catch (error) { console.error('Unexpected error in data_Load:', error); }

    data_isLoading = false;
    await data_updatePager();
};
$('#appRecordsPager').value = 1;
await data_Load();
//#endregion


//#region data
$('#confirmClearData').on('click', async function () {
    this.parentElement.oncancel = () => false;
    this.parentElement.querySelectorAll('button').forEach(el => el.disabled = true);

    await userdata.clear(rec);
    await delay(1000);
    
    this.parentElement.close();
    location.reload();
});
//#endregion


$('.loading-mask').innerHTML = '正在完成';
await delay((Math.floor(Math.random() * 1000)));
$().classList.remove('is-loading');

