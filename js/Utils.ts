interface PubSubCallback {
    (data: any): void
}
class PubSub {
    private pubSubHash: { [property: string]: PubSubCallback[] };
    constructor() {
        this.pubSubHash = {};
    }
    subscribe(event: string, callback: PubSubCallback): void {
        if (!this.pubSubHash[event]) {
            this.pubSubHash[event] = [];
        }
        this.pubSubHash[event].push(callback);
    }
    unsubscribe(event: string, callback?: PubSubCallback): void {
        if (callback === undefined) {
            this.pubSubHash[event] = [];
        } else if (this.pubSubHash[event]) {
            this.pubSubHash[event].forEach((value, i) => {
                if (value === callback) {
                    this.pubSubHash[event].splice(i, 1);
                }
            });
        }
    }
    publish(event: string, data: any) {
        if (this.pubSubHash[event]) {
            this.pubSubHash[event].forEach(value => {
                value(data);
            });
        }
    }
}

interface ObservableValueCallback {
    (value: any): void
}
class ObservableValue {
    private observableValueCallbacks: ObservableValueCallback[];
    constructor(public value: any) {
        this.observableValueCallbacks = [];
    }
    set(value: any) {
        this.value = value;
        this.observableValueCallbacks.forEach(callback => {
            callback(this.value);
        });
    }
    onChange(callback: ObservableValueCallback) {
        callback(this.value);
        this.observableValueCallbacks.push(callback);
    }
}

interface DatasetParams {
    [property: string]: any
}
class Dataset {
    private datasetState: DatasetParams;
    constructor(params: DatasetParams) {
        if (params) {
            this.datasetState = params;
        }
    }
    get(key?: string): any {
        if (key === undefined) {
            return Object.assign({}, this.datasetState);
        }
        return this.datasetState[key];
    }
    set(newData: DatasetParams) {
        var delta = {};
        Object.keys(newData).forEach(key => {
            if (this.datasetState[key] !== newData[key]) {
                this.datasetState[key] = newData[key];
                delta[key] = newData[key];
            }
        });
        return delta;
    }
}

class Random {
    static number(min: any = 0, max: number = 1): number {
        if (Array.isArray(min)) {
            return min[Random.number(0, min.length - 1)];
        } else {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
    }
    static color(): string {
        var color: number[] = [];
        for (let i = -1; ++i < 3;) {
            color.push(Random.number(0, 255));
        }
        return 'rgb(' + color.join() + ')';
    }
}

class Vector {
    static add(v1: number[], v2: number[]): number[] {
        var result = [];
        for (let i = 0; i < v1.length; i++) {
            result.push(v1[i] + v2[i]);
        }
        return result;
    }
    static intersect(v1: number[], v2: number[]): boolean {
        var result = false;
        for (let i = 0; i < v1.length; i++) {
            if (v2.indexOf(v1[i]) !== -1) {
                result = true;
                break;
            }
        }
        return result;
    }
    static getDistance(vector1: number[], vector2: number[]): number {
        var tmp = 0;
        for (let i = 0; i < vector1.length; i++) {
            tmp += Math.pow(vector1[i] - vector2[i], 2);
        }
        return Math.sqrt(tmp);
    }
    static normalize(vector: number[]): number[] {
        var vectorSize = 0;
        var result = [];
        for (let i = 0; i < vector.length; i++) {
            vectorSize += Math.pow(vector[i], 2);
        }
        vectorSize = Math.sqrt(vectorSize);
        for (let i = 0; i < vector.length; i++) {
            result.push(vector[i] / vectorSize);
        }
        return result;
    }
}

class Angle {
    static PI: number = 3.1415;
    static toRad(deg: number): number {
        return deg * Angle.PI / 180;
    }
    static toDeg(rad: number): number {
        return rad * 180 / Angle.PI;
    }
}

export default class Utils {
    static Random: typeof Random = Random;
    static Vector: typeof Vector = Vector;
    static round(value: number, precision: number): number {
        return Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);
    }
    static pubSub: PubSub = new PubSub();
    static Angle: typeof Angle = Angle;
    static observableValue(value: any) {
        return new ObservableValue(value);
    }
    static dataset(params: DatasetParams) {
        return new Dataset(params);
    }
}
