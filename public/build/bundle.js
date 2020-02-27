
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.19.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/components/Hello.svelte generated by Svelte v3.19.1 */

    const file = "src/components/Hello.svelte";

    function create_fragment(ctx) {
    	let section;
    	let header;
    	let img;
    	let img_src_value;
    	let t0;
    	let h1;
    	let t2;
    	let p0;
    	let t3;
    	let b0;
    	let t5;
    	let t6;
    	let p1;
    	let b1;
    	let t8;
    	let t9;
    	let p2;

    	const block = {
    		c: function create() {
    			section = element("section");
    			header = element("header");
    			img = element("img");
    			t0 = space();
    			h1 = element("h1");
    			h1.textContent = "My job application for PeachPlugin";
    			t2 = space();
    			p0 = element("p");
    			t3 = text("Hello! I'm ");
    			b0 = element("b");
    			b0.textContent = "HENRY TABIMA GIRALDO";
    			t5 = text(". I’m a Mechatronic engineer and Full-stack Developer with knowledge in data science. I’ve worked implementing software for energy management systems and as a Mentor and technical support engineer for students at Microverse, a remote school for software development. I’m currently looking for a job as a remote full-stack or front-end developer that will put my engineering skills to work.");
    			t6 = space();
    			p1 = element("p");
    			b1 = element("b");
    			b1.textContent = "I've tried by myself the plugin and I really love it!";
    			t8 = text(" It feels like a game, and watching the peaches going up while doing what I already do is amazing. for sure, this is something I would love work in.");
    			t9 = space();
    			p2 = element("p");
    			p2.textContent = "I’m passionate about problem-solving and coding in JavaScript and think I could be a great addition to your development team. I’d like to talk and learn more about the PeachPlugin goals and how I could contribute.";
    			attr_dev(img, "alt", "peach plugin logo");
    			if (img.src !== (img_src_value = "peach.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "width", "50px");
    			attr_dev(img, "height", "50px");
    			attr_dev(img, "class", "svelte-u6matr");
    			add_location(img, file, 2, 4, 25);
    			attr_dev(h1, "class", "svelte-u6matr");
    			add_location(h1, file, 3, 4, 103);
    			attr_dev(header, "class", "svelte-u6matr");
    			add_location(header, file, 1, 2, 12);
    			add_location(b0, file, 8, 16, 188);
    			attr_dev(p0, "class", "svelte-u6matr");
    			add_location(p0, file, 8, 2, 174);
    			add_location(b1, file, 9, 5, 614);
    			attr_dev(p1, "class", "svelte-u6matr");
    			add_location(p1, file, 9, 2, 611);
    			attr_dev(p2, "class", "svelte-u6matr");
    			add_location(p2, file, 10, 2, 829);
    			add_location(section, file, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, header);
    			append_dev(header, img);
    			append_dev(header, t0);
    			append_dev(header, h1);
    			append_dev(section, t2);
    			append_dev(section, p0);
    			append_dev(p0, t3);
    			append_dev(p0, b0);
    			append_dev(p0, t5);
    			append_dev(section, t6);
    			append_dev(section, p1);
    			append_dev(p1, b1);
    			append_dev(p1, t8);
    			append_dev(section, t9);
    			append_dev(section, p2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Hello extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Hello",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/components/Topbar.svelte generated by Svelte v3.19.1 */

    const file$1 = "src/components/Topbar.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let a0;
    	let t1;
    	let a1;
    	let t3;
    	let a2;
    	let t5;
    	let a3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			a0 = element("a");
    			a0.textContent = "Portfolio";
    			t1 = space();
    			a1 = element("a");
    			a1.textContent = "GitHub";
    			t3 = space();
    			a2 = element("a");
    			a2.textContent = "LinkedIn";
    			t5 = space();
    			a3 = element("a");
    			a3.textContent = "Angelist";
    			attr_dev(a0, "href", "https://henrytabima.com");
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "class", "svelte-t6ofuc");
    			add_location(a0, file$1, 1, 2, 23);
    			attr_dev(a1, "href", "https://github.com/HenryTabima");
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "class", "svelte-t6ofuc");
    			add_location(a1, file$1, 2, 2, 89);
    			attr_dev(a2, "href", "https://www.linkedin.com/in/henrytabimagiraldo/");
    			attr_dev(a2, "target", "_blank");
    			attr_dev(a2, "class", "svelte-t6ofuc");
    			add_location(a2, file$1, 3, 2, 159);
    			attr_dev(a3, "href", "https://angel.co/henrytabimagiraldo");
    			attr_dev(a3, "target", "_blank");
    			attr_dev(a3, "class", "svelte-t6ofuc");
    			add_location(a3, file$1, 4, 2, 248);
    			attr_dev(div, "class", "topbar svelte-t6ofuc");
    			add_location(div, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, a0);
    			append_dev(div, t1);
    			append_dev(div, a1);
    			append_dev(div, t3);
    			append_dev(div, a2);
    			append_dev(div, t5);
    			append_dev(div, a3);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Topbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Topbar",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/components/Fullpage.svelte generated by Svelte v3.19.1 */

    function create_fragment$2(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Fullpage extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Fullpage",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/components/Suggested.svelte generated by Svelte v3.19.1 */

    const file$2 = "src/components/Suggested.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let header;
    	let img;
    	let img_src_value;
    	let t0;
    	let span;
    	let t2;
    	let main;
    	let button0;
    	let t4;
    	let button1;
    	let t6;
    	let button2;
    	let t8;
    	let button3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			header = element("header");
    			img = element("img");
    			t0 = space();
    			span = element("span");
    			span.textContent = "Welcome HenryTG";
    			t2 = space();
    			main = element("main");
    			button0 = element("button");
    			button0.textContent = "My Account";
    			t4 = space();
    			button1 = element("button");
    			button1.textContent = "My Posts";
    			t6 = space();
    			button2 = element("button");
    			button2.textContent = "My Tasks";
    			t8 = space();
    			button3 = element("button");
    			button3.textContent = "Log Out";
    			if (img.src !== (img_src_value = "peach.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "peach plugin logo 3x");
    			attr_dev(img, "class", "svelte-1gwt08");
    			add_location(img, file$2, 2, 4, 39);
    			attr_dev(span, "class", "svelte-1gwt08");
    			add_location(span, file$2, 3, 4, 92);
    			attr_dev(header, "class", "svelte-1gwt08");
    			add_location(header, file$2, 1, 2, 26);
    			attr_dev(button0, "class", "svelte-1gwt08");
    			add_location(button0, file$2, 6, 4, 146);
    			attr_dev(button1, "class", "svelte-1gwt08");
    			add_location(button1, file$2, 7, 4, 178);
    			attr_dev(button2, "class", "svelte-1gwt08");
    			add_location(button2, file$2, 8, 4, 208);
    			attr_dev(button3, "class", "svelte-1gwt08");
    			add_location(button3, file$2, 9, 4, 238);
    			add_location(main, file$2, 5, 2, 135);
    			attr_dev(div, "class", "container svelte-1gwt08");
    			add_location(div, file$2, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, header);
    			append_dev(header, img);
    			append_dev(header, t0);
    			append_dev(header, span);
    			append_dev(div, t2);
    			append_dev(div, main);
    			append_dev(main, button0);
    			append_dev(main, t4);
    			append_dev(main, button1);
    			append_dev(main, t6);
    			append_dev(main, button2);
    			append_dev(main, t8);
    			append_dev(main, button3);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Suggested extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Suggested",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/components/Improvements.svelte generated by Svelte v3.19.1 */
    const file$3 = "src/components/Improvements.svelte";

    function create_fragment$4(ctx) {
    	let section;
    	let h2;
    	let t1;
    	let ul;
    	let li0;
    	let t2;
    	let a;
    	let t4;
    	let t5;
    	let li1;
    	let p;
    	let t7;
    	let div2;
    	let div0;
    	let h30;
    	let t9;
    	let img;
    	let img_src_value;
    	let t10;
    	let div1;
    	let h31;
    	let t12;
    	let current;
    	const suggested = new Suggested({ $$inline: true });

    	const block = {
    		c: function create() {
    			section = element("section");
    			h2 = element("h2");
    			h2.textContent = "My improvement suggestions";
    			t1 = space();
    			ul = element("ul");
    			li0 = element("li");
    			t2 = text("The widget could improved following the ");
    			a = element("a");
    			a.textContent = "Motion";
    			t4 = text("'s one style");
    			t5 = space();
    			li1 = element("li");
    			p = element("p");
    			p.textContent = "In the website and mainly in the plugin popup there is a lot of unused white space and an unnecessary scroll.";
    			t7 = space();
    			div2 = element("div");
    			div0 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Current State";
    			t9 = space();
    			img = element("img");
    			t10 = space();
    			div1 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Suggested";
    			t12 = space();
    			create_component(suggested.$$.fragment);
    			add_location(h2, file$3, 5, 2, 77);
    			attr_dev(a, "href", "https://www.inmotion.app/");
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "class", "svelte-1q4lcuv");
    			add_location(a, file$3, 7, 48, 168);
    			add_location(li0, file$3, 7, 4, 124);
    			add_location(p, file$3, 9, 6, 263);
    			add_location(h30, file$3, 12, 10, 450);
    			if (img.src !== (img_src_value = "current.JPG")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "peach plugin screeshot");
    			attr_dev(img, "width", "300");
    			attr_dev(img, "class", "svelte-1q4lcuv");
    			add_location(img, file$3, 13, 10, 483);
    			attr_dev(div0, "class", "current svelte-1q4lcuv");
    			add_location(div0, file$3, 11, 8, 418);
    			add_location(h31, file$3, 16, 10, 603);
    			attr_dev(div1, "class", "suggested svelte-1q4lcuv");
    			add_location(div1, file$3, 15, 8, 569);
    			attr_dev(div2, "class", "container svelte-1q4lcuv");
    			add_location(div2, file$3, 10, 6, 386);
    			add_location(li1, file$3, 8, 4, 252);
    			add_location(ul, file$3, 6, 2, 115);
    			add_location(section, file$3, 4, 0, 65);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, h2);
    			append_dev(section, t1);
    			append_dev(section, ul);
    			append_dev(ul, li0);
    			append_dev(li0, t2);
    			append_dev(li0, a);
    			append_dev(li0, t4);
    			append_dev(ul, t5);
    			append_dev(ul, li1);
    			append_dev(li1, p);
    			append_dev(li1, t7);
    			append_dev(li1, div2);
    			append_dev(div2, div0);
    			append_dev(div0, h30);
    			append_dev(div0, t9);
    			append_dev(div0, img);
    			append_dev(div2, t10);
    			append_dev(div2, div1);
    			append_dev(div1, h31);
    			append_dev(div1, t12);
    			mount_component(suggested, div1, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(suggested.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(suggested.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_component(suggested);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	$$self.$capture_state = () => ({ Suggested });
    	return [];
    }

    class Improvements extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Improvements",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/components/Issues.svelte generated by Svelte v3.19.1 */

    const file$4 = "src/components/Issues.svelte";

    function create_fragment$5(ctx) {
    	let section;
    	let h2;
    	let t1;
    	let ul;
    	let li0;
    	let t3;
    	let li1;
    	let t5;
    	let li2;
    	let t7;
    	let div;
    	let img0;
    	let img0_src_value;
    	let t8;
    	let img1;
    	let img1_src_value;
    	let t9;
    	let p;

    	const block = {
    		c: function create() {
    			section = element("section");
    			h2 = element("h2");
    			h2.textContent = "Here a couple of issues I found";
    			t1 = space();
    			ul = element("ul");
    			li0 = element("li");
    			li0.textContent = "The Plugin logs into the browser console (this could be a security issue), and is unconfotable when working as developer.";
    			t3 = space();
    			li1 = element("li");
    			li1.textContent = "Once you take your widget out of the screen by the left side, is near to impossible to get it back";
    			t5 = space();
    			li2 = element("li");
    			li2.textContent = "I told to my best friend to try the plugin, and he was getting NaN as peach count";
    			t7 = space();
    			div = element("div");
    			img0 = element("img");
    			t8 = space();
    			img1 = element("img");
    			t9 = space();
    			p = element("p");
    			p.textContent = "PD: I have work with firebase before.";
    			add_location(h2, file$4, 1, 2, 12);
    			add_location(li0, file$4, 3, 4, 64);
    			add_location(li1, file$4, 4, 4, 199);
    			add_location(li2, file$4, 5, 4, 311);
    			attr_dev(ul, "class", "svelte-15wqy2h");
    			add_location(ul, file$4, 2, 2, 55);
    			attr_dev(img0, "alt", "Logs in console");
    			if (img0.src !== (img0_src_value = "logs.JPG")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "width", "400");
    			add_location(img0, file$4, 8, 4, 444);
    			attr_dev(img1, "alt", "NaN counter");
    			if (img1.src !== (img1_src_value = "NaN.jpg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "widt", "300");
    			attr_dev(img1, "height", "100");
    			add_location(img1, file$4, 9, 4, 502);
    			attr_dev(div, "class", "img-container svelte-15wqy2h");
    			add_location(div, file$4, 7, 2, 412);
    			add_location(p, file$4, 11, 2, 572);
    			add_location(section, file$4, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, h2);
    			append_dev(section, t1);
    			append_dev(section, ul);
    			append_dev(ul, li0);
    			append_dev(ul, t3);
    			append_dev(ul, li1);
    			append_dev(ul, t5);
    			append_dev(ul, li2);
    			append_dev(section, t7);
    			append_dev(section, div);
    			append_dev(div, img0);
    			append_dev(div, t8);
    			append_dev(div, img1);
    			append_dev(section, t9);
    			append_dev(section, p);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Issues extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Issues",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /*
    Adapted from https://github.com/mattdesl
    Distributed under MIT License https://github.com/mattdesl/eases/blob/master/LICENSE.md
    */
    function backInOut(t) {
        const s = 1.70158 * 1.525;
        if ((t *= 2) < 1)
            return 0.5 * (t * t * ((s + 1) * t - s));
        return 0.5 * ((t -= 2) * t * ((s + 1) * t + s) + 2);
    }
    function backIn(t) {
        const s = 1.70158;
        return t * t * ((s + 1) * t - s);
    }
    function backOut(t) {
        const s = 1.70158;
        return --t * t * ((s + 1) * t + s) + 1;
    }
    function bounceOut(t) {
        const a = 4.0 / 11.0;
        const b = 8.0 / 11.0;
        const c = 9.0 / 10.0;
        const ca = 4356.0 / 361.0;
        const cb = 35442.0 / 1805.0;
        const cc = 16061.0 / 1805.0;
        const t2 = t * t;
        return t < a
            ? 7.5625 * t2
            : t < b
                ? 9.075 * t2 - 9.9 * t + 3.4
                : t < c
                    ? ca * t2 - cb * t + cc
                    : 10.8 * t * t - 20.52 * t + 10.72;
    }
    function bounceInOut(t) {
        return t < 0.5
            ? 0.5 * (1.0 - bounceOut(1.0 - t * 2.0))
            : 0.5 * bounceOut(t * 2.0 - 1.0) + 0.5;
    }
    function bounceIn(t) {
        return 1.0 - bounceOut(1.0 - t);
    }
    function circInOut(t) {
        if ((t *= 2) < 1)
            return -0.5 * (Math.sqrt(1 - t * t) - 1);
        return 0.5 * (Math.sqrt(1 - (t -= 2) * t) + 1);
    }
    function circIn(t) {
        return 1.0 - Math.sqrt(1.0 - t * t);
    }
    function circOut(t) {
        return Math.sqrt(1 - --t * t);
    }
    function cubicInOut(t) {
        return t < 0.5 ? 4.0 * t * t * t : 0.5 * Math.pow(2.0 * t - 2.0, 3.0) + 1.0;
    }
    function cubicIn(t) {
        return t * t * t;
    }
    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }
    function elasticInOut(t) {
        return t < 0.5
            ? 0.5 *
                Math.sin(((+13.0 * Math.PI) / 2) * 2.0 * t) *
                Math.pow(2.0, 10.0 * (2.0 * t - 1.0))
            : 0.5 *
                Math.sin(((-13.0 * Math.PI) / 2) * (2.0 * t - 1.0 + 1.0)) *
                Math.pow(2.0, -10.0 * (2.0 * t - 1.0)) +
                1.0;
    }
    function elasticIn(t) {
        return Math.sin((13.0 * t * Math.PI) / 2) * Math.pow(2.0, 10.0 * (t - 1.0));
    }
    function elasticOut(t) {
        return (Math.sin((-13.0 * (t + 1.0) * Math.PI) / 2) * Math.pow(2.0, -10.0 * t) + 1.0);
    }
    function expoInOut(t) {
        return t === 0.0 || t === 1.0
            ? t
            : t < 0.5
                ? +0.5 * Math.pow(2.0, 20.0 * t - 10.0)
                : -0.5 * Math.pow(2.0, 10.0 - t * 20.0) + 1.0;
    }
    function expoIn(t) {
        return t === 0.0 ? t : Math.pow(2.0, 10.0 * (t - 1.0));
    }
    function expoOut(t) {
        return t === 1.0 ? t : 1.0 - Math.pow(2.0, -10.0 * t);
    }
    function quadInOut(t) {
        t /= 0.5;
        if (t < 1)
            return 0.5 * t * t;
        t--;
        return -0.5 * (t * (t - 2) - 1);
    }
    function quadIn(t) {
        return t * t;
    }
    function quadOut(t) {
        return -t * (t - 2.0);
    }
    function quartInOut(t) {
        return t < 0.5
            ? +8.0 * Math.pow(t, 4.0)
            : -8.0 * Math.pow(t - 1.0, 4.0) + 1.0;
    }
    function quartIn(t) {
        return Math.pow(t, 4.0);
    }
    function quartOut(t) {
        return Math.pow(t - 1.0, 3.0) * (1.0 - t) + 1.0;
    }
    function quintInOut(t) {
        if ((t *= 2) < 1)
            return 0.5 * t * t * t * t * t;
        return 0.5 * ((t -= 2) * t * t * t * t + 2);
    }
    function quintIn(t) {
        return t * t * t * t * t;
    }
    function quintOut(t) {
        return --t * t * t * t * t + 1;
    }
    function sineInOut(t) {
        return -0.5 * (Math.cos(Math.PI * t) - 1);
    }
    function sineIn(t) {
        const v = Math.cos(t * Math.PI * 0.5);
        if (Math.abs(v) < 1e-14)
            return 1;
        else
            return 1 - v;
    }
    function sineOut(t) {
        return Math.sin((t * Math.PI) / 2);
    }

    var easings = /*#__PURE__*/Object.freeze({
        __proto__: null,
        backIn: backIn,
        backInOut: backInOut,
        backOut: backOut,
        bounceIn: bounceIn,
        bounceInOut: bounceInOut,
        bounceOut: bounceOut,
        circIn: circIn,
        circInOut: circInOut,
        circOut: circOut,
        cubicIn: cubicIn,
        cubicInOut: cubicInOut,
        cubicOut: cubicOut,
        elasticIn: elasticIn,
        elasticInOut: elasticInOut,
        elasticOut: elasticOut,
        expoIn: expoIn,
        expoInOut: expoInOut,
        expoOut: expoOut,
        quadIn: quadIn,
        quadInOut: quadInOut,
        quadOut: quadOut,
        quartIn: quartIn,
        quartInOut: quartInOut,
        quartOut: quartOut,
        quintIn: quintIn,
        quintInOut: quintInOut,
        quintOut: quintOut,
        sineIn: sineIn,
        sineInOut: sineInOut,
        sineOut: sineOut,
        linear: identity
    });

    var _ = {
      $(selector) {
        if (typeof selector === "string") {
          return document.querySelector(selector);
        }
        return selector;
      },
      extend(...args) {
        return Object.assign(...args);
      },
      cumulativeOffset(element) {
        let top = 0;
        let left = 0;

        do {
          top += element.offsetTop || 0;
          left += element.offsetLeft || 0;
          element = element.offsetParent;
        } while (element);

        return {
          top: top,
          left: left
        };
      },
      directScroll(element) {
        return element && element !== document && element !== document.body;
      },
      scrollTop(element, value) {
        let inSetter = value !== undefined;
        if (this.directScroll(element)) {
          return inSetter ? (element.scrollTop = value) : element.scrollTop;
        } else {
          return inSetter
            ? (document.documentElement.scrollTop = document.body.scrollTop = value)
            : window.pageYOffset ||
                document.documentElement.scrollTop ||
                document.body.scrollTop ||
                0;
        }
      },
      scrollLeft(element, value) {
        let inSetter = value !== undefined;
        if (this.directScroll(element)) {
          return inSetter ? (element.scrollLeft = value) : element.scrollLeft;
        } else {
          return inSetter
            ? (document.documentElement.scrollLeft = document.body.scrollLeft = value)
            : window.pageXOffset ||
                document.documentElement.scrollLeft ||
                document.body.scrollLeft ||
                0;
        }
      }
    };

    const defaultOptions = {
      container: "body",
      duration: 500,
      delay: 0,
      offset: 0,
      easing: "cubicInOut",
      onStart: noop,
      onDone: noop,
      onAborting: noop,
      scrollX: false,
      scrollY: true
    };

    const _scrollTo = options => {
      let {
        offset,
        duration,
        delay,
        easing,
        x=0,
        y=0,
        scrollX,
        scrollY,
        onStart,
        onDone,
        container,
        onAborting,
        element
      } = options;

      if (typeof easing === "string") {
        easing = easings[easing];
      }
      if (typeof offset === "function") {
        offset = offset();
      }

      var cumulativeOffsetContainer = _.cumulativeOffset(container);
      var cumulativeOffsetTarget = element
        ? _.cumulativeOffset(element)
        : { top: y, left: x };

      var initialX = _.scrollLeft(container);
      var initialY = _.scrollTop(container);

      var targetX =
        cumulativeOffsetTarget.left - cumulativeOffsetContainer.left + offset;
      var targetY =
        cumulativeOffsetTarget.top - cumulativeOffsetContainer.top + offset;

      var diffX = targetX - initialX;
    	var diffY = targetY - initialY;

      let scrolling = true;
      let started = false;
      let start_time = now() + delay;
      let end_time = start_time + duration;

      function scrollToTopLeft(element, top, left) {
        if (scrollX) _.scrollLeft(element, left);
        if (scrollY) _.scrollTop(element, top);
      }

      function start(delayStart) {
        if (!delayStart) {
          started = true;
          onStart(element, {x, y});
        }
      }

      function tick(progress) {
        scrollToTopLeft(
          container,
          initialY + diffY * progress,
          initialX + diffX * progress
        );
      }

      function stop() {
        scrolling = false;
      }

      loop(now => {
        if (!started && now >= start_time) {
          start(false);
        }

        if (started && now >= end_time) {
          tick(1);
          stop();
          onDone(element, {x, y});
        }

        if (!scrolling) {
          onAborting(element, {x, y});
          return false;
        }
        if (started) {
          const p = now - start_time;
          const t = 0 + 1 * easing(p / duration);
          tick(t);
        }

        return true;
      });

      start(delay);

      tick(0);

      return stop;
    };

    const proceedOptions = options => {
    	let opts = _.extend({}, defaultOptions, options);
      opts.container = _.$(opts.container);
      opts.element = _.$(opts.element);
      return opts;
    };

    const scrollTo$1 = options => {
      return _scrollTo(proceedOptions(options));
    };

    const makeScrollToAction = scrollToFunc => {
      return (node, options) => {
        let current = options;
        const handle = e => {
          e.preventDefault();
          scrollToFunc(
            typeof current === "string" ? { element: current } : current
          );
        };
        node.addEventListener("click", handle);
        node.addEventListener("touchstart", handle);
        return {
          update(options) {
            current = options;
          },
          destroy() {
            node.removeEventListener("click", handle);
            node.removeEventListener("touchstart", handle);
          }
        };
      };
    };

    const scrollto = makeScrollToAction(scrollTo$1);

    function getOffset (el) {
      let _x = 0;
      let _y = 0;
      while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
        _x += el.offsetLeft - el.scrollLeft;
        _y += el.offsetTop - el.scrollTop;
        el = el.offsetParent;
      }
      return { top: _y, left: _x }
    }

    /* src/App.svelte generated by Svelte v3.19.1 */
    const file$5 = "src/App.svelte";

    function create_fragment$6(ctx) {
    	let scrolling = false;

    	let clear_scrolling = () => {
    		scrolling = false;
    	};

    	let scrolling_timeout;
    	let t0;
    	let main;
    	let section0;
    	let t1;
    	let footer0;
    	let scrollto_action;
    	let t3;
    	let section1;
    	let t4;
    	let footer1;
    	let scrollto_action_1;
    	let t6;
    	let section2;
    	let t7;
    	let footer2;
    	let scrollto_action_2;
    	let current;
    	let dispose;
    	add_render_callback(/*onwindowscroll*/ ctx[1]);
    	const topbar = new Topbar({ $$inline: true });
    	const hello = new Hello({ $$inline: true });
    	const improvements = new Improvements({ $$inline: true });
    	const issues = new Issues({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(topbar.$$.fragment);
    			t0 = space();
    			main = element("main");
    			section0 = element("section");
    			create_component(hello.$$.fragment);
    			t1 = space();
    			footer0 = element("footer");
    			footer0.textContent = "↓ Scroll down to see more thoughts about the Plugin ↓";
    			t3 = space();
    			section1 = element("section");
    			create_component(improvements.$$.fragment);
    			t4 = space();
    			footer1 = element("footer");
    			footer1.textContent = "↓ I also discovered some issues, scroll down to see them ↓";
    			t6 = space();
    			section2 = element("section");
    			create_component(issues.$$.fragment);
    			t7 = space();
    			footer2 = element("footer");
    			footer2.textContent = "↑ Back to Top ↑";
    			attr_dev(footer0, "class", "cta svelte-norrwr");
    			add_location(footer0, file$5, 18, 2, 459);
    			attr_dev(section0, "id", "about");
    			attr_dev(section0, "class", "svelte-norrwr");
    			add_location(section0, file$5, 16, 1, 425);
    			attr_dev(footer1, "class", "cta svelte-norrwr");
    			add_location(footer1, file$5, 22, 2, 634);
    			attr_dev(section1, "id", "improvements");
    			attr_dev(section1, "class", "svelte-norrwr");
    			add_location(section1, file$5, 20, 1, 586);
    			attr_dev(footer2, "class", "cta svelte-norrwr");
    			add_location(footer2, file$5, 26, 2, 796);
    			attr_dev(section2, "id", "issues");
    			attr_dev(section2, "class", "svelte-norrwr");
    			add_location(section2, file$5, 24, 1, 760);
    			attr_dev(main, "class", "svelte-norrwr");
    			add_location(main, file$5, 15, 0, 417);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(topbar, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, section0);
    			mount_component(hello, section0, null);
    			append_dev(section0, t1);
    			append_dev(section0, footer0);
    			append_dev(main, t3);
    			append_dev(main, section1);
    			mount_component(improvements, section1, null);
    			append_dev(section1, t4);
    			append_dev(section1, footer1);
    			append_dev(main, t6);
    			append_dev(main, section2);
    			mount_component(issues, section2, null);
    			append_dev(section2, t7);
    			append_dev(section2, footer2);
    			current = true;

    			dispose = [
    				listen_dev(window, "scroll", () => {
    					scrolling = true;
    					clearTimeout(scrolling_timeout);
    					scrolling_timeout = setTimeout(clear_scrolling, 100);
    					/*onwindowscroll*/ ctx[1]();
    				}),
    				action_destroyer(scrollto_action = scrollto.call(null, footer0, "#improvements")),
    				action_destroyer(scrollto_action_1 = scrollto.call(null, footer1, "#issues")),
    				action_destroyer(scrollto_action_2 = scrollto.call(null, footer2, "#about"))
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*y*/ 1 && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window.pageXOffset, /*y*/ ctx[0]);
    				scrolling_timeout = setTimeout(clear_scrolling, 100);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(topbar.$$.fragment, local);
    			transition_in(hello.$$.fragment, local);
    			transition_in(improvements.$$.fragment, local);
    			transition_in(issues.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(topbar.$$.fragment, local);
    			transition_out(hello.$$.fragment, local);
    			transition_out(improvements.$$.fragment, local);
    			transition_out(issues.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(topbar, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_component(hello);
    			destroy_component(improvements);
    			destroy_component(issues);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let y;

    	function onwindowscroll() {
    		$$invalidate(0, y = window.pageYOffset);
    	}

    	$$self.$capture_state = () => ({
    		Hello,
    		Topbar,
    		Fullpage,
    		Improvements,
    		Issues,
    		scrollto,
    		getOffset,
    		y
    	});

    	$$self.$inject_state = $$props => {
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [y, onwindowscroll];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
