// Default values
const settings = {
	autoWatch: false,
	autoToggleErrors: true,
	autoOpenWatch: true,
	autoLayout: false,
}

// Load from local storage
for(const k in settings) {
	const val = localStorage.getItem(`settings.${k}`);
	if(val !== null) {
		(settings as any)[k] = JSON.parse(val);
	}
}

export type Settings = typeof settings;
export default new Proxy(settings, {
	set(obj, k, v): boolean {
		localStorage.setItem(`settings.${String(k)}`, JSON.stringify(v));
		return Reflect.set(obj, k, v);
	},
});
