/*[==BEGIN=EXTENSION=METADATA==]{
    "id": "fa22d72e-1a5e-47bf-99e0-f0b2c5035fb7",
    "name": "统计 <stat> 1.0",
    "version": "1.1",
    "scopes": ["record.html$"]
}[==END=EXTENSION=METADATA==]*/

console.log('func1.js run');



const content = document.querySelector('.app-related-content');

const el = document.createElement('details');
el.innerHTML = `
<summary>统计 &lt;stat&gt; 1.0</summary>

<div>
    <div id=data_func_result style="border: 1px solid; padding: 0.5em; margin-bottom: 0.5em; border-radius: 5px; font-size: larger;">在下面选择一个函数，然后点击[计算]。</div>
    <div style="display: flex;">
        <select id=data_func_fn></select>
        <input id=data_func_desc readonly style="margin: 0 0.5em; flex: 1; font-family: 'Consolas', monospace;">
        <button id=data_func_btn>Compute</button>
    </div>
    <fieldset disabled hidden>
        <legend>[可选] 数据范围  &lt;开发中&gt;</legend>
        <div>
            <div>开始时间: <input type=date> <input type=time step=1>
            <div>结束时间: <input type=date> <input type=time step=1>
        </div>
    </fieldset>
</div>
`;
(content.lastElementChild) ? (content.lastElementChild.before(el)) : content.append(el);

const $ = s => el.querySelector(s);



const fn = {
    SUM: {
        desc: '计算所有数值的和',
        invoker(last, value) {
            return last + value;
        },
    },
    AVERAGE: {
        desc: '返回算术平均值',
        all: true,
        invoker(values) {
            let val = 0; for (const i of values) val += i;
            return val / values.length;
        },
    },
    COUNT: {
        desc: '计算区域中是数字的单元格的个数',
        raw: true,
        invoker(last, raw) {
            return last + (isNaN(raw) ? 0 : 1);
        },
    },
    COUNT2: {
        desc: '计算区域中包含数字的单元格的个数',
        invoker(last, value) {
            return last + 1;
        },
    },
    MIN: {
        desc: '返回一组数值中的最小值，忽略逻辑值及文本',
        invoker(last, value) {
            return Math.min(last, value);
        },
    },
    MAX: {
        desc: '返回一组数值中的最大值，忽略逻辑值及文本',
        invoker(last, value) {
            return Math.max(last, value);
        },
    },
    SIN: {
        desc: '返回给定角度的正弦值之和',
        invoker: (last, value) => last + Math.sin(value),
    },
};



const dfn = $('#data_func_fn');
for (const i in fn) {
    const el = document.createElement('option');
    el.value = el.innerText = i;
    dfn.append(el);
}




function getDesc() {
    $('#data_func_desc').value = fn[dfn.value].desc;
}
dfn.addEventListener('change', getDesc);
queueMicrotask(getDesc);



const pageURL = new URL(location.href);
const rec = pageURL.searchParams.get('id');
const dfb = el.querySelector('#data_func_btn');
dfb.onclick = async function () {
    dfn.disabled = dfb.disabled = true;
    const oldText = dfb.innerHTML;
    dfb.innerText = '请稍候...';
    let result = 0;
    const invoker = fn[dfn.value].invoker;
    const raw = !!fn[dfn.value].raw, all = !!fn[dfn.value].all;
    const resultArr = all ? new Array() : null;
    try {
        let tx = userdata.transaction(rec);
        let cursor = await tx.store.openCursor(undefined, 'prev');

        while (cursor) {
            const n = parseFloat(cursor.value.value);
            if (!isNaN(n)) {
                if (all) {
                    resultArr.push(raw ? cursor.value.value : n);
                } else {
                    result = invoker(result, raw ? cursor.value.value : n);
                }
            }
            try { cursor = await cursor.continue(); }
            catch { break; }
        }

        if (resultArr) result = invoker(resultArr);
    } catch (error) { console.error('Unexpected error in func1.js:', error); }
    el.querySelector('#data_func_result').innerText = dfn.value + ' = ' + result;
    dfb.innerHTML = oldText;
    dfn.disabled = dfb.disabled = false;
}







