/*[==BEGIN=EXTENSION=METADATA==]{
    "id": "f4858686-68db-4b30-9cdf-e497da61f700",
    "name": "数据: 求和 (SUM)",
    "version": "1.1",
    "scopes": ["record.html$"]
}[==END=EXTENSION=METADATA==]*/

console.log('SUM.js run');

const content = document.querySelector('.app-related-content');

const el = document.createElement('details');
el.innerHTML = `
<summary>数据: 求和 (SUM)</summary>

<div>
    <div><b>温馨提示</b>: 建议所有用户迁移到[统计 &lt;stat&gt;]扩展，以获得更好的使用体验</div>
    <div id=data_sum_result></div>
    <button id=data_sum_sum>SUM</button>
</div>
`;
(content.lastElementChild) ? (content.lastElementChild.before(el)) : content.append(el);


const pageURL = new URL(location.href);
const rec = pageURL.searchParams.get('id');
const dss = el.querySelector('#data_sum_sum');
dss.onclick = async function () {
    dss.disabled = true;
    let sum = 0;
    try {
        let tx = userdata.transaction(rec);
        let cursor = await tx.store.openCursor(undefined, 'prev');

        while (cursor) {
            const n = parseInt(cursor.value.value);
            if (!isNaN(n)) sum += n;
            try { cursor = await cursor.continue(); }
            catch { break; }
        }
    } catch (error) { console.error('Unexpected error in SUM.js:', error); }
    el.querySelector('#data_sum_result').innerText = 'SUM = ' + sum;
    dss.disabled = false;
}





