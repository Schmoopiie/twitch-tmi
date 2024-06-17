class EventEmitter {
	constructor() {
		this._events = new Map();
	}
	emit(type, ...args) {
		const listeners = this._events.get(type);
		if(!listeners) {
			return false;
		}
		for(const listener of listeners) {
			listener.apply(this, args);
		}
		return true;
	}
	emits(types, values) {
		for(let i = 0; i < types.length; i++) {
			const val = i < values.length ? values[i] : values[values.length - 1];
			this.emit.apply(this, [ types[i] ].concat(val));
		}
	}
	addListener(type, listener) {
		if(!this._events.has(type)) {
			this._events.set(type, new Set());
		}
		this._events.get(type).add(listener);
	}
	on(type, listener) {
		this.addListener(type, listener);
	}
	once(type, listener) {
		const wrapped = (...args) => {
			this.removeListener(type, wrapped);
			listener.apply(this, args);
		};
		this.addListener(type, wrapped);
	}
	removeListener(type, listener) {
		if(!this._events.has(type)) {
			return;
		}
		this._events.get(type).delete(listener);
	}
	off(type, listener) {
		this.removeListener(type, listener);
	}
	removeAllListeners(type) {
		this._events.delete(type);
	}
	listeners(type) {
		return this._events.get(type);
	}
	listenerCount(type) {
		const listeners = this._events.get(type);
		if(!listeners) {
			return 0;
		}
		return listeners.size;
	}
}

module.exports = EventEmitter;
