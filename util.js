


export function delay(time = 0) {
    return new Promise(resolve => setTimeout(resolve, time));
}


export function queryElement(root, selector, noCache = false) {
    if (!selector) return root;
    const thisObj = (
        typeof this === 'object' ?
            (Reflect.getPrototypeOf(this) === null ?
                (this) : Object.create(null))
            : Object.create(null)
    );

    if (!(thisObj.__caches__ instanceof Map)) thisObj.__caches__ = new Map();
    else if (!noCache) {
        const result = thisObj.__caches__.get(selector);
        if (result) return result;
    }

    const result = root.querySelector(selector);
    if (result) {
        if (!result.on) result.on = result.addEventListener;
    }
    if (result && !noCache) thisObj.__caches__.set(selector, result);
    return result;
}

export function wrapQueryElement(root) {
    return queryElement.bind(Object.create(null), root);
}


export const showTip_style = {
    position: 'fixed', left: 0, right: 0, top: 0, bottom: 0, outline: 0,
    zIndex: 2097152, background: 'rgba(0, 0, 0, 0.5)', cursor: 'not-allowed',
    userSelect: 'none',
};
export const showTip_style_2 = {
    position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
    maxWidth: '100%',
    background: 'var(--color-scheme-background, #ffffff)',
    border: '1px solid gray',
    padding: '10px',
    cursor: 'default',
    maxHeight: 'calc(100% - 30px)', overflow: 'auto',
};
export function showTip(content, html = false, time = 0) {
    const current_focus = document.querySelector(':focus');
    const el = document.createElement('div');
    el.role = 'dialog';
    const style1 = document.createElement('style');
    style1.innerText = `*, html, body { overflow: hidden; }`;
    el.append(style1);
    for (const i in showTip_style) el.style[i] = showTip_style[i];
    const cont = document.createElement('div');
    for (const i in showTip_style_2) cont.style[i] = showTip_style_2[i];
    el.tabIndex = 1;
    el.append(cont);
    let closed = false, onclose = null;
    const evt = new EventTarget();
    Object.defineProperties(evt, {
        close: { value: close, enumerable: true },
        closed: { get() { return closed }, enumerable: true },
        el: { value: function () { return el }, enumerable: true },
        onclose: {
            get() { return onclose },
            set(val) {
                val ? evt.addEventListener('close', val) : evt.removeEventListener('close', onclose);
                onclose = val;
                return true;
            },
        },
    })
    // console.log(evt);
    function close() {
        el.remove();
        closed = true;
        evt.dispatchEvent(new CustomEvent('close'));
    };
    evt.addEventListener('close', function () {
        queueMicrotask(() => current_focus && current_focus.focus());
    });

    cont[html ? 'innerHTML' : 'innerText'] = content;
    el.onkeydown = el.onpointerdown = ev => ev.preventDefault();
    el.onkeyup = el.onpointerup = ev => ev.preventDefault();
    const ignoreKeys = ['Home', 'End', 'Control', 'Shift', 'Alt', 'Tab',];
    const handlers = () => {
        el.onclick = () => close();
        el.onkeydown = (ev) => {
            if (ev.key === 'ArrowDown') cont.scrollBy({ left: 0, top: 10, behavior: 'smooth' });
            else if (ev.key === 'ArrowUp') cont.scrollBy({ left: 0, top: -10, behavior: 'smooth' });
            else if (ev.key === 'PageDown') cont.scrollBy({ left: 0, top: cont.clientHeight, behavior: 'smooth' });
            else if (ev.key === 'PageUp') cont.scrollBy({ left: 0, top: -cont.clientHeight, behavior: 'smooth' });
            else if (ignoreKeys.includes(ev.key)) {}
            else if (ev.ctrlKey || ev.shiftKey || ev.altKey) {}
            else el._flag = true;
        };
        el.onkeyup = () => { el._flag && close() };
    };
    if (time) setTimeout(handlers, time);
    else queueMicrotask(handlers);

    (document.body || document.documentElement).append(el);
    el.focus();

    return evt;
}











