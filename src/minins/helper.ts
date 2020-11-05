export function uuidv4(): string {
    // @ts-expect-error can't figure out how to remove TS error
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

export function getProperty<T, K extends keyof T>(o: T, propertyName: string): T[K] {
    return o[propertyName]; // o[propertyName] is of type T[K]
}

export class DeferredPromise {
    private _promise: Promise<void>
    private _resolve!: () => void;
    private _reject!: () => void
    private _then
    private _catch

    constructor(timeout: number) {
        this._promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });

        setTimeout(() => {
            this.resolve()
        }, timeout)

        // bind `then` and `catch` to implement the same interface as Promise
        this._then = this._promise.then.bind(this._promise);
        this._catch = this._promise.catch.bind(this._promise);

        this[Symbol.toStringTag] = 'Promise';
    }

    public wait() {
        return this._promise
    }

    public get resolve() {
        return this._resolve
    }

    public get reject() {
        return this._reject
    }

    public get then() {
        return this._then
    }

    public get catch() {
        return this._catch
    }
}