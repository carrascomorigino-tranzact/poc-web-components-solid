(() => {
  // node_modules/solid-js/dist/solid.js
  var sharedConfig = {};
  var equalFn = (a, b) => a === b;
  var $PROXY = Symbol("solid-proxy");
  var $DEVCOMP = Symbol("solid-dev-component");
  var signalOptions = {
    equals: equalFn
  };
  var ERROR = null;
  var runEffects = runQueue;
  var NOTPENDING = {};
  var STALE = 1;
  var PENDING = 2;
  var UNOWNED = {
    owned: null,
    cleanups: null,
    context: null,
    owner: null
  };
  var [transPending, setTransPending] = /* @__PURE__ */ createSignal(false);
  var Owner = null;
  var Transition = null;
  var Scheduler = null;
  var ExternalSourceFactory = null;
  var Listener = null;
  var Pending = null;
  var Updates = null;
  var Effects = null;
  var ExecCount = 0;
  function createRoot(fn, detachedOwner) {
    detachedOwner && (Owner = detachedOwner);
    const listener = Listener, owner = Owner, root = fn.length === 0 && true ? UNOWNED : {
      owned: null,
      cleanups: null,
      context: null,
      owner
    };
    Owner = root;
    Listener = null;
    try {
      return runUpdates(() => fn(() => cleanNode(root)), true);
    } finally {
      Listener = listener;
      Owner = owner;
    }
  }
  function createSignal(value, options) {
    options = options ? Object.assign({}, signalOptions, options) : signalOptions;
    const s = {
      value,
      observers: null,
      observerSlots: null,
      pending: NOTPENDING,
      comparator: options.equals || void 0
    };
    const setter = (value2) => {
      if (typeof value2 === "function") {
        if (Transition && Transition.running && Transition.sources.has(s))
          value2 = value2(s.pending !== NOTPENDING ? s.pending : s.tValue);
        else
          value2 = value2(s.pending !== NOTPENDING ? s.pending : s.value);
      }
      return writeSignal(s, value2);
    };
    return [readSignal.bind(s), setter];
  }
  function createComputed(fn, value, options) {
    const c = createComputation(fn, value, true, STALE);
    if (Scheduler && Transition && Transition.running)
      Updates.push(c);
    else
      updateComputation(c);
  }
  function createRenderEffect(fn, value, options) {
    const c = createComputation(fn, value, false, STALE);
    if (Scheduler && Transition && Transition.running)
      Updates.push(c);
    else
      updateComputation(c);
  }
  function createMemo(fn, value, options) {
    options = options ? Object.assign({}, signalOptions, options) : signalOptions;
    const c = createComputation(fn, value, true, 0);
    c.pending = NOTPENDING;
    c.observers = null;
    c.observerSlots = null;
    c.comparator = options.equals || void 0;
    if (Scheduler && Transition && Transition.running) {
      c.tState = STALE;
      Updates.push(c);
    } else
      updateComputation(c);
    return readSignal.bind(c);
  }
  function batch(fn) {
    if (Pending)
      return fn();
    let result;
    const q = Pending = [];
    try {
      result = fn();
    } finally {
      Pending = null;
    }
    runUpdates(() => {
      for (let i = 0; i < q.length; i += 1) {
        const data = q[i];
        if (data.pending !== NOTPENDING) {
          const pending = data.pending;
          data.pending = NOTPENDING;
          writeSignal(data, pending);
        }
      }
    }, false);
    return result;
  }
  function untrack(fn) {
    let result, listener = Listener;
    Listener = null;
    result = fn();
    Listener = listener;
    return result;
  }
  function onCleanup(fn) {
    if (Owner === null)
      ;
    else if (Owner.cleanups === null)
      Owner.cleanups = [fn];
    else
      Owner.cleanups.push(fn);
    return fn;
  }
  function startTransition(fn) {
    if (Transition && Transition.running) {
      fn();
      return Transition.done;
    }
    const l = Listener;
    const o = Owner;
    return Promise.resolve().then(() => {
      Listener = l;
      Owner = o;
      let t;
      if (Scheduler || SuspenseContext) {
        t = Transition || (Transition = {
          sources: /* @__PURE__ */ new Set(),
          effects: [],
          promises: /* @__PURE__ */ new Set(),
          disposed: /* @__PURE__ */ new Set(),
          queue: /* @__PURE__ */ new Set(),
          running: true
        });
        t.done || (t.done = new Promise((res) => t.resolve = res));
        t.running = true;
      }
      batch(fn);
      return t ? t.done : void 0;
    });
  }
  function createContext(defaultValue) {
    const id = Symbol("context");
    return {
      id,
      Provider: createProvider(id),
      defaultValue
    };
  }
  function children(fn) {
    const children2 = createMemo(fn);
    return createMemo(() => resolveChildren(children2()));
  }
  var SuspenseContext;
  function readSignal() {
    const runningTransition = Transition && Transition.running;
    if (this.sources && (!runningTransition && this.state || runningTransition && this.tState)) {
      const updates = Updates;
      Updates = null;
      !runningTransition && this.state === STALE || runningTransition && this.tState === STALE ? updateComputation(this) : lookDownstream(this);
      Updates = updates;
    }
    if (Listener) {
      const sSlot = this.observers ? this.observers.length : 0;
      if (!Listener.sources) {
        Listener.sources = [this];
        Listener.sourceSlots = [sSlot];
      } else {
        Listener.sources.push(this);
        Listener.sourceSlots.push(sSlot);
      }
      if (!this.observers) {
        this.observers = [Listener];
        this.observerSlots = [Listener.sources.length - 1];
      } else {
        this.observers.push(Listener);
        this.observerSlots.push(Listener.sources.length - 1);
      }
    }
    if (runningTransition && Transition.sources.has(this))
      return this.tValue;
    return this.value;
  }
  function writeSignal(node, value, isComp) {
    if (node.comparator) {
      if (Transition && Transition.running && Transition.sources.has(node)) {
        if (node.comparator(node.tValue, value))
          return value;
      } else if (node.comparator(node.value, value))
        return value;
    }
    if (Pending) {
      if (node.pending === NOTPENDING)
        Pending.push(node);
      node.pending = value;
      return value;
    }
    let TransitionRunning = false;
    if (Transition) {
      TransitionRunning = Transition.running;
      if (TransitionRunning || !isComp && Transition.sources.has(node)) {
        Transition.sources.add(node);
        node.tValue = value;
      }
      if (!TransitionRunning)
        node.value = value;
    } else
      node.value = value;
    if (node.observers && node.observers.length) {
      runUpdates(() => {
        for (let i = 0; i < node.observers.length; i += 1) {
          const o = node.observers[i];
          if (TransitionRunning && Transition.disposed.has(o))
            continue;
          if (o.pure)
            Updates.push(o);
          else
            Effects.push(o);
          if (o.observers && (TransitionRunning && !o.tState || !TransitionRunning && !o.state))
            markUpstream(o);
          if (TransitionRunning)
            o.tState = STALE;
          else
            o.state = STALE;
        }
        if (Updates.length > 1e6) {
          Updates = [];
          if (false)
            ;
          throw new Error();
        }
      }, false);
    }
    return value;
  }
  function updateComputation(node) {
    if (!node.fn)
      return;
    cleanNode(node);
    const owner = Owner, listener = Listener, time = ExecCount;
    Listener = Owner = node;
    runComputation(node, Transition && Transition.running && Transition.sources.has(node) ? node.tValue : node.value, time);
    if (Transition && !Transition.running && Transition.sources.has(node)) {
      queueMicrotask(() => {
        runUpdates(() => {
          Transition && (Transition.running = true);
          runComputation(node, node.tValue, time);
        }, false);
      });
    }
    Listener = listener;
    Owner = owner;
  }
  function runComputation(node, value, time) {
    let nextValue;
    try {
      nextValue = node.fn(value);
    } catch (err) {
      handleError(err);
    }
    if (!node.updatedAt || node.updatedAt <= time) {
      if (node.observers && node.observers.length) {
        writeSignal(node, nextValue, true);
      } else if (Transition && Transition.running && node.pure) {
        Transition.sources.add(node);
        node.tValue = nextValue;
      } else
        node.value = nextValue;
      node.updatedAt = time;
    }
  }
  function createComputation(fn, init, pure, state = STALE, options) {
    const c = {
      fn,
      state,
      updatedAt: null,
      owned: null,
      sources: null,
      sourceSlots: null,
      cleanups: null,
      value: init,
      owner: Owner,
      context: null,
      pure
    };
    if (Transition && Transition.running) {
      c.state = 0;
      c.tState = state;
    }
    if (Owner === null)
      ;
    else if (Owner !== UNOWNED) {
      if (Transition && Transition.running && Owner.pure) {
        if (!Owner.tOwned)
          Owner.tOwned = [c];
        else
          Owner.tOwned.push(c);
      } else {
        if (!Owner.owned)
          Owner.owned = [c];
        else
          Owner.owned.push(c);
      }
    }
    if (ExternalSourceFactory) {
      const [track, trigger] = createSignal(void 0, {
        equals: false
      });
      const ordinary = ExternalSourceFactory(c.fn, trigger);
      onCleanup(() => ordinary.dispose());
      const triggerInTransition = () => startTransition(trigger).then(() => inTransition.dispose());
      const inTransition = ExternalSourceFactory(c.fn, triggerInTransition);
      c.fn = (x) => {
        track();
        return Transition && Transition.running ? inTransition.track(x) : ordinary.track(x);
      };
    }
    return c;
  }
  function runTop(node) {
    const runningTransition = Transition && Transition.running;
    if (!runningTransition && node.state !== STALE)
      return node.state = 0;
    if (runningTransition && node.tState !== STALE)
      return node.tState = 0;
    if (node.suspense && untrack(node.suspense.inFallback))
      return node.suspense.effects.push(node);
    const ancestors = [node];
    while ((node = node.owner) && (!node.updatedAt || node.updatedAt < ExecCount)) {
      if (runningTransition && Transition.disposed.has(node))
        return;
      if (!runningTransition && node.state || runningTransition && node.tState)
        ancestors.push(node);
    }
    for (let i = ancestors.length - 1; i >= 0; i--) {
      node = ancestors[i];
      if (runningTransition) {
        let top = node, prev = ancestors[i + 1];
        while ((top = top.owner) && top !== prev) {
          if (Transition.disposed.has(top))
            return;
        }
      }
      if (!runningTransition && node.state === STALE || runningTransition && node.tState === STALE) {
        updateComputation(node);
      } else if (!runningTransition && node.state === PENDING || runningTransition && node.tState === PENDING) {
        const updates = Updates;
        Updates = null;
        lookDownstream(node, ancestors[0]);
        Updates = updates;
      }
    }
  }
  function runUpdates(fn, init) {
    if (Updates)
      return fn();
    let wait = false;
    if (!init)
      Updates = [];
    if (Effects)
      wait = true;
    else
      Effects = [];
    ExecCount++;
    try {
      return fn();
    } catch (err) {
      handleError(err);
    } finally {
      completeUpdates(wait);
    }
  }
  function completeUpdates(wait) {
    if (Updates) {
      if (Scheduler && Transition && Transition.running)
        scheduleQueue(Updates);
      else
        runQueue(Updates);
      Updates = null;
    }
    if (wait)
      return;
    let res;
    if (Transition && Transition.running) {
      if (Transition.promises.size || Transition.queue.size) {
        Transition.running = false;
        Transition.effects.push.apply(Transition.effects, Effects);
        Effects = null;
        setTransPending(true);
        return;
      }
      const sources = Transition.sources;
      res = Transition.resolve;
      Effects.forEach((e) => {
        "tState" in e && (e.state = e.tState);
        delete e.tState;
      });
      Transition = null;
      batch(() => {
        sources.forEach((v) => {
          v.value = v.tValue;
          if (v.owned) {
            for (let i = 0, len = v.owned.length; i < len; i++)
              cleanNode(v.owned[i]);
          }
          if (v.tOwned)
            v.owned = v.tOwned;
          delete v.tValue;
          delete v.tOwned;
          v.tState = 0;
        });
        setTransPending(false);
      });
    }
    if (Effects.length)
      batch(() => {
        runEffects(Effects);
        Effects = null;
      });
    else {
      Effects = null;
    }
    if (res)
      res();
  }
  function runQueue(queue) {
    for (let i = 0; i < queue.length; i++)
      runTop(queue[i]);
  }
  function scheduleQueue(queue) {
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      const tasks = Transition.queue;
      if (!tasks.has(item)) {
        tasks.add(item);
        Scheduler(() => {
          tasks.delete(item);
          runUpdates(() => {
            Transition.running = true;
            runTop(item);
            if (!tasks.size) {
              Effects.push.apply(Effects, Transition.effects);
              Transition.effects = [];
            }
          }, false);
          Transition && (Transition.running = false);
        });
      }
    }
  }
  function lookDownstream(node, ignore) {
    node.state = 0;
    const runningTransition = Transition && Transition.running;
    for (let i = 0; i < node.sources.length; i += 1) {
      const source = node.sources[i];
      if (source.sources) {
        if (!runningTransition && source.state === STALE || runningTransition && source.tState === STALE) {
          if (source !== ignore)
            runTop(source);
        } else if (!runningTransition && source.state === PENDING || runningTransition && source.tState === PENDING)
          lookDownstream(source, ignore);
      }
    }
  }
  function markUpstream(node) {
    const runningTransition = Transition && Transition.running;
    for (let i = 0; i < node.observers.length; i += 1) {
      const o = node.observers[i];
      if (!runningTransition && !o.state || runningTransition && !o.tState) {
        if (runningTransition)
          o.tState = PENDING;
        else
          o.state = PENDING;
        if (o.pure)
          Updates.push(o);
        else
          Effects.push(o);
        o.observers && markUpstream(o);
      }
    }
  }
  function cleanNode(node) {
    let i;
    if (node.sources) {
      while (node.sources.length) {
        const source = node.sources.pop(), index = node.sourceSlots.pop(), obs = source.observers;
        if (obs && obs.length) {
          const n = obs.pop(), s = source.observerSlots.pop();
          if (index < obs.length) {
            n.sourceSlots[s] = index;
            obs[index] = n;
            source.observerSlots[index] = s;
          }
        }
      }
    }
    if (Transition && Transition.running && node.pure) {
      if (node.tOwned) {
        for (i = 0; i < node.tOwned.length; i++)
          cleanNode(node.tOwned[i]);
        delete node.tOwned;
      }
      reset(node, true);
    } else if (node.owned) {
      for (i = 0; i < node.owned.length; i++)
        cleanNode(node.owned[i]);
      node.owned = null;
    }
    if (node.cleanups) {
      for (i = 0; i < node.cleanups.length; i++)
        node.cleanups[i]();
      node.cleanups = null;
    }
    if (Transition && Transition.running)
      node.tState = 0;
    else
      node.state = 0;
    node.context = null;
  }
  function reset(node, top) {
    if (!top) {
      node.tState = 0;
      Transition.disposed.add(node);
    }
    if (node.owned) {
      for (let i = 0; i < node.owned.length; i++)
        reset(node.owned[i]);
    }
  }
  function handleError(err) {
    const fns = ERROR && lookup(Owner, ERROR);
    if (!fns)
      throw err;
    fns.forEach((f) => f(err));
  }
  function lookup(owner, key) {
    return owner && (owner.context && owner.context[key] !== void 0 ? owner.context[key] : owner.owner && lookup(owner.owner, key));
  }
  function resolveChildren(children2) {
    if (typeof children2 === "function" && !children2.length)
      return resolveChildren(children2());
    if (Array.isArray(children2)) {
      const results = [];
      for (let i = 0; i < children2.length; i++) {
        const result = resolveChildren(children2[i]);
        Array.isArray(result) ? results.push.apply(results, result) : results.push(result);
      }
      return results;
    }
    return children2;
  }
  function createProvider(id) {
    return function provider(props) {
      let res;
      createComputed(() => res = untrack(() => {
        Owner.context = {
          [id]: props.value
        };
        return children(() => props.children);
      }));
      return res;
    };
  }
  var FALLBACK = Symbol("fallback");
  var SuspenseListContext = createContext();

  // node_modules/solid-js/web/dist/web.js
  var booleans = ["allowfullscreen", "async", "autofocus", "autoplay", "checked", "controls", "default", "disabled", "formnovalidate", "hidden", "indeterminate", "ismap", "loop", "multiple", "muted", "nomodule", "novalidate", "open", "playsinline", "readonly", "required", "reversed", "seamless", "selected"];
  var Properties = /* @__PURE__ */ new Set(["className", "value", "readOnly", "formNoValidate", "isMap", "noModule", "playsInline", ...booleans]);
  function reconcileArrays(parentNode, a, b) {
    let bLength = b.length, aEnd = a.length, bEnd = bLength, aStart = 0, bStart = 0, after = a[aEnd - 1].nextSibling, map = null;
    while (aStart < aEnd || bStart < bEnd) {
      if (a[aStart] === b[bStart]) {
        aStart++;
        bStart++;
        continue;
      }
      while (a[aEnd - 1] === b[bEnd - 1]) {
        aEnd--;
        bEnd--;
      }
      if (aEnd === aStart) {
        const node = bEnd < bLength ? bStart ? b[bStart - 1].nextSibling : b[bEnd - bStart] : after;
        while (bStart < bEnd)
          parentNode.insertBefore(b[bStart++], node);
      } else if (bEnd === bStart) {
        while (aStart < aEnd) {
          if (!map || !map.has(a[aStart]))
            a[aStart].remove();
          aStart++;
        }
      } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
        const node = a[--aEnd].nextSibling;
        parentNode.insertBefore(b[bStart++], a[aStart++].nextSibling);
        parentNode.insertBefore(b[--bEnd], node);
        a[aEnd] = b[bEnd];
      } else {
        if (!map) {
          map = /* @__PURE__ */ new Map();
          let i = bStart;
          while (i < bEnd)
            map.set(b[i], i++);
        }
        const index = map.get(a[aStart]);
        if (index != null) {
          if (bStart < index && index < bEnd) {
            let i = aStart, sequence = 1, t;
            while (++i < aEnd && i < bEnd) {
              if ((t = map.get(a[i])) == null || t !== index + sequence)
                break;
              sequence++;
            }
            if (sequence > index - bStart) {
              const node = a[aStart];
              while (bStart < index)
                parentNode.insertBefore(b[bStart++], node);
            } else
              parentNode.replaceChild(b[bStart++], a[aStart++]);
          } else
            aStart++;
        } else
          a[aStart++].remove();
      }
    }
  }
  var $$EVENTS = "_$DX_DELEGATE";
  function template(html, check, isSVG) {
    const t = document.createElement("template");
    t.innerHTML = html;
    let node = t.content.firstChild;
    if (isSVG)
      node = node.firstChild;
    return node;
  }
  function delegateEvents(eventNames, document2 = window.document) {
    const e = document2[$$EVENTS] || (document2[$$EVENTS] = /* @__PURE__ */ new Set());
    for (let i = 0, l = eventNames.length; i < l; i++) {
      const name = eventNames[i];
      if (!e.has(name)) {
        e.add(name);
        document2.addEventListener(name, eventHandler);
      }
    }
  }
  function insert(parent, accessor, marker, initial) {
    if (marker !== void 0 && !initial)
      initial = [];
    if (typeof accessor !== "function")
      return insertExpression(parent, accessor, initial, marker);
    createRenderEffect((current) => insertExpression(parent, accessor(), current, marker), initial);
  }
  function eventHandler(e) {
    const key = `$$${e.type}`;
    let node = e.composedPath && e.composedPath()[0] || e.target;
    if (e.target !== node) {
      Object.defineProperty(e, "target", {
        configurable: true,
        value: node
      });
    }
    Object.defineProperty(e, "currentTarget", {
      configurable: true,
      get() {
        return node || document;
      }
    });
    while (node !== null) {
      const handler = node[key];
      if (handler && !node.disabled) {
        const data = node[`${key}Data`];
        data !== void 0 ? handler(data, e) : handler(e);
        if (e.cancelBubble)
          return;
      }
      node = node.host && node.host !== node && node.host instanceof Node ? node.host : node.parentNode;
    }
  }
  function insertExpression(parent, value, current, marker, unwrapArray) {
    if (sharedConfig.context && !current)
      current = [...parent.childNodes];
    while (typeof current === "function")
      current = current();
    if (value === current)
      return current;
    const t = typeof value, multi = marker !== void 0;
    parent = multi && current[0] && current[0].parentNode || parent;
    if (t === "string" || t === "number") {
      if (t === "number")
        value = value.toString();
      if (multi) {
        let node = current[0];
        if (node && node.nodeType === 3) {
          node.data = value;
        } else
          node = document.createTextNode(value);
        current = cleanChildren(parent, current, marker, node);
      } else {
        if (current !== "" && typeof current === "string") {
          current = parent.firstChild.data = value;
        } else
          current = parent.textContent = value;
      }
    } else if (value == null || t === "boolean") {
      if (sharedConfig.context)
        return current;
      current = cleanChildren(parent, current, marker);
    } else if (t === "function") {
      createRenderEffect(() => {
        let v = value();
        while (typeof v === "function")
          v = v();
        current = insertExpression(parent, v, current, marker);
      });
      return () => current;
    } else if (Array.isArray(value)) {
      const array = [];
      if (normalizeIncomingArray(array, value, unwrapArray)) {
        createRenderEffect(() => current = insertExpression(parent, array, current, marker, true));
        return () => current;
      }
      if (sharedConfig.context && current && current.length) {
        for (let i = 0; i < array.length; i++) {
          if (array[i].parentNode)
            return current = array;
        }
        return current;
      }
      if (array.length === 0) {
        current = cleanChildren(parent, current, marker);
        if (multi)
          return current;
      } else {
        if (Array.isArray(current)) {
          if (current.length === 0) {
            appendNodes(parent, array, marker);
          } else
            reconcileArrays(parent, current, array);
        } else if (current == null || current === "") {
          appendNodes(parent, array);
        } else {
          reconcileArrays(parent, multi && current || [parent.firstChild], array);
        }
      }
      current = array;
    } else if (value instanceof Node) {
      if (sharedConfig.context)
        return current = value.parentNode ? multi ? [value] : value : current;
      if (Array.isArray(current)) {
        if (multi)
          return current = cleanChildren(parent, current, marker, value);
        cleanChildren(parent, current, null, value);
      } else if (current == null || current === "" || !parent.firstChild) {
        parent.appendChild(value);
      } else
        parent.replaceChild(value, parent.firstChild);
      current = value;
    } else
      ;
    return current;
  }
  function normalizeIncomingArray(normalized, array, unwrap) {
    let dynamic = false;
    for (let i = 0, len = array.length; i < len; i++) {
      let item = array[i], t;
      if (item instanceof Node) {
        normalized.push(item);
      } else if (item == null || item === true || item === false)
        ;
      else if (Array.isArray(item)) {
        dynamic = normalizeIncomingArray(normalized, item) || dynamic;
      } else if ((t = typeof item) === "string") {
        normalized.push(document.createTextNode(item));
      } else if (t === "function") {
        if (unwrap) {
          while (typeof item === "function")
            item = item();
          dynamic = normalizeIncomingArray(normalized, Array.isArray(item) ? item : [item]) || dynamic;
        } else {
          normalized.push(item);
          dynamic = true;
        }
      } else
        normalized.push(document.createTextNode(item.toString()));
    }
    return dynamic;
  }
  function appendNodes(parent, array, marker) {
    for (let i = 0, len = array.length; i < len; i++)
      parent.insertBefore(array[i], marker);
  }
  function cleanChildren(parent, current, marker, replacement) {
    if (marker === void 0)
      return parent.textContent = "";
    const node = replacement || document.createTextNode("");
    if (current.length) {
      let inserted = false;
      for (let i = current.length - 1; i >= 0; i--) {
        const el = current[i];
        if (node !== el) {
          const isParent = el.parentNode === parent;
          if (!inserted && !i)
            isParent ? parent.replaceChild(node, el) : parent.insertBefore(node, marker);
          else
            isParent && el.remove();
        } else
          inserted = true;
      }
    } else
      parent.insertBefore(node, marker);
    return [node];
  }

  // node_modules/component-register/dist/component-register.js
  function cloneProps(props) {
    const propKeys = Object.keys(props);
    return propKeys.reduce((memo, k) => {
      const prop = props[k];
      memo[k] = Object.assign({}, prop);
      if (isObject(prop.value) && !isFunction(prop.value) && !Array.isArray(prop.value))
        memo[k].value = Object.assign({}, prop.value);
      if (Array.isArray(prop.value))
        memo[k].value = prop.value.slice(0);
      return memo;
    }, {});
  }
  function normalizePropDefs(props) {
    if (!props)
      return {};
    const propKeys = Object.keys(props);
    return propKeys.reduce((memo, k) => {
      const v = props[k];
      memo[k] = !(isObject(v) && "value" in v) ? {
        value: v
      } : v;
      memo[k].attribute || (memo[k].attribute = toAttribute(k));
      memo[k].parse = typeof memo[k].value !== "string";
      return memo;
    }, {});
  }
  function propValues(props) {
    const propKeys = Object.keys(props);
    return propKeys.reduce((memo, k) => {
      memo[k] = props[k].value;
      return memo;
    }, {});
  }
  function initializeProps(element, propDefinition) {
    const props = cloneProps(propDefinition), propKeys = Object.keys(propDefinition);
    propKeys.forEach((key) => {
      const prop = props[key], attr = element.getAttribute(prop.attribute), value = element[key];
      if (attr && prop.parse)
        prop.value = parseAttributeValue(attr);
      if (value != null)
        prop.value = Array.isArray(value) ? value.slice(0) : value;
      prop.reflect && reflect(element, prop.attribute, prop.value);
      Object.defineProperty(element, key, {
        get() {
          return prop.value;
        },
        set(val) {
          const oldValue = prop.value;
          prop.value = val;
          prop.reflect && reflect(this, prop.attribute, prop.value);
          for (let i = 0, l = this.__propertyChangedCallbacks.length; i < l; i++) {
            this.__propertyChangedCallbacks[i](key, val, oldValue);
          }
        },
        enumerable: true,
        configurable: true
      });
    });
    return props;
  }
  function parseAttributeValue(value) {
    if (!value)
      return;
    try {
      return JSON.parse(value);
    } catch (err) {
      return value;
    }
  }
  function reflect(node, attribute, value) {
    if (value == null || value === false)
      return node.removeAttribute(attribute);
    let reflect2 = JSON.stringify(value);
    node.__updating[attribute] = true;
    if (reflect2 === "true")
      reflect2 = "";
    node.setAttribute(attribute, reflect2);
    Promise.resolve().then(() => delete node.__updating[attribute]);
  }
  function toAttribute(propName) {
    return propName.replace(/\.?([A-Z]+)/g, (x, y) => "-" + y.toLowerCase()).replace("_", "-").replace(/^-/, "");
  }
  function isObject(obj) {
    return obj != null && (typeof obj === "object" || typeof obj === "function");
  }
  function isFunction(val) {
    return Object.prototype.toString.call(val) === "[object Function]";
  }
  function isConstructor(f) {
    return typeof f === "function" && f.toString().indexOf("class") === 0;
  }
  var currentElement;
  function createElementType(BaseElement, propDefinition) {
    const propKeys = Object.keys(propDefinition);
    return class CustomElement extends BaseElement {
      static get observedAttributes() {
        return propKeys.map((k) => propDefinition[k].attribute);
      }
      constructor() {
        super();
        this.__initialized = false;
        this.__released = false;
        this.__releaseCallbacks = [];
        this.__propertyChangedCallbacks = [];
        this.__updating = {};
        this.props = {};
      }
      connectedCallback() {
        if (this.__initialized)
          return;
        this.__releaseCallbacks = [];
        this.__propertyChangedCallbacks = [];
        this.__updating = {};
        this.props = initializeProps(this, propDefinition);
        const props = propValues(this.props), ComponentType = this.Component, outerElement = currentElement;
        try {
          currentElement = this;
          this.__initialized = true;
          if (isConstructor(ComponentType))
            new ComponentType(props, {
              element: this
            });
          else
            ComponentType(props, {
              element: this
            });
        } finally {
          currentElement = outerElement;
        }
      }
      async disconnectedCallback() {
        await Promise.resolve();
        if (this.isConnected)
          return;
        this.__propertyChangedCallbacks.length = 0;
        let callback = null;
        while (callback = this.__releaseCallbacks.pop())
          callback(this);
        delete this.__initialized;
        this.__released = true;
      }
      attributeChangedCallback(name, oldVal, newVal) {
        if (!this.__initialized)
          return;
        if (this.__updating[name])
          return;
        name = this.lookupProp(name);
        if (name in propDefinition) {
          if (newVal == null && !this[name])
            return;
          this[name] = propDefinition[name].parse ? parseAttributeValue(newVal) : newVal;
        }
      }
      lookupProp(attrName) {
        if (!propDefinition)
          return;
        return propKeys.find((k) => attrName === k || attrName === propDefinition[k].attribute);
      }
      get renderRoot() {
        return this.shadowRoot || this.attachShadow({
          mode: "open"
        });
      }
      addReleaseCallback(fn) {
        this.__releaseCallbacks.push(fn);
      }
      addPropertyChangedCallback(fn) {
        this.__propertyChangedCallbacks.push(fn);
      }
    };
  }
  var EC = Symbol("element-context");
  function register(tag, props = {}, options = {}) {
    const {
      BaseElement = HTMLElement,
      extension
    } = options;
    return (ComponentType) => {
      if (!tag)
        throw new Error("tag is required to register a Component");
      let ElementType = customElements.get(tag);
      if (ElementType) {
        ElementType.prototype.Component = ComponentType;
        return ElementType;
      }
      ElementType = createElementType(BaseElement, normalizePropDefs(props));
      ElementType.prototype.Component = ComponentType;
      ElementType.prototype.registeredTag = tag;
      customElements.define(tag, ElementType, extension);
      return ElementType;
    };
  }

  // node_modules/solid-element/dist/index.js
  function createProps(raw) {
    const keys = Object.keys(raw);
    const props = {};
    for (let i = 0; i < keys.length; i++) {
      const [get, set] = createSignal(raw[keys[i]]);
      Object.defineProperty(props, keys[i], {
        get,
        set(v) {
          set(() => v);
        }
      });
    }
    return props;
  }
  function lookupContext(el) {
    if (el.assignedSlot && el.assignedSlot._$owner)
      return el.assignedSlot._$owner;
    let next = el.parentNode;
    while (next && !next._$owner && !(next.assignedSlot && next.assignedSlot._$owner))
      next = next.parentNode;
    return next && next.assignedSlot ? next.assignedSlot._$owner : el._$owner;
  }
  function withSolid(ComponentType) {
    return (rawProps, options) => {
      const { element } = options;
      return createRoot((dispose) => {
        const props = createProps(rawProps);
        element.addPropertyChangedCallback((key, val) => props[key] = val);
        element.addReleaseCallback(() => {
          element.renderRoot.textContent = "";
          dispose();
        });
        const comp = ComponentType(props, options);
        return insert(element.renderRoot, comp);
      }, lookupContext(element));
    };
  }
  function customElement(tag, props, ComponentType) {
    if (arguments.length === 2) {
      ComponentType = props;
      props = {};
    }
    return register(tag, props)(withSolid(ComponentType));
  }

  // components/Counter.jsx
  var _tmpl$ = template(`<div><style>div * {
          font-size: 200%;
        }

        span {
          width: 4rem;
          display: inline-block;
          text-align: center;
        }

        button {
          width: 4rem;
          height: 4rem;
          border: none;
          border-radius: 10px;
          background-color: seagreen;
          color: white;
        }</style><button>-</button><span></span><button>+</button></div>`, 10);
  customElement("solid-counter", () => {
    const [count, setCount] = createSignal(0);
    return (() => {
      const _el$ = _tmpl$.cloneNode(true), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling, _el$4 = _el$3.nextSibling, _el$5 = _el$4.nextSibling;
      _el$3.$$click = () => setCount(count() - 1);
      insert(_el$4, count);
      _el$5.$$click = () => setCount(count() + 1);
      return _el$;
    })();
  });
  delegateEvents(["click"]);
})();
