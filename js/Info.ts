/**
 * Timer constructor
 */
class Timer {
    element: HTMLElement;
    private startTime: number;
    private worker: Worker;
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'timer';
        this.startTime = Date.now();
        this.worker = new Worker('js/timerWorker.js');
        this.worker.addEventListener('message', () => {
            this.tick();
        }, false);
        this.worker.postMessage('start');
        this.tick();
    }

    /**
     * Updates time string
     */
    tick(): void {
        var delta:Date = new Date(Date.now() - this.startTime);
        var hours:string = delta.getUTCHours().toString();
        var minutes:string = ('0' + delta.getMinutes()).substr(-2);
        var seconds:string = ('0' + delta.getSeconds()).substr(-2);
        this.element.innerHTML = `${hours || '00'}:${minutes}:${seconds}`;
    }
}

interface DataItemParams {
    label: string,
    getter: { (): any },
    interval: number
}
/**
 * Data row constructor
 */
class DataItem {
    element: HTMLElement;
    private dataContainerElement: HTMLElement;
    private timer: number;
    constructor(params: DataItemParams) {
        this.element = document.createElement('div');
        this.element.className = 'data-item';
        this.element.innerHTML = params.label + ':';
        this.dataContainerElement = document.createElement('div');
        this.dataContainerElement.className = 'data-container';
        this.element.appendChild(this.dataContainerElement);
        // periodically updating data
        this.timer = setInterval(() => {
            this.dataContainerElement.innerHTML = params.getter();
        }, params.interval);
    }
}

/**
 * Info block constructor
 */
export default class Info {
    element: HTMLElement;
    timer: Timer;
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'info';
        this.timer = new Timer();
        this.element.appendChild(this.timer.element);
        document.body.appendChild(this.element);
    }

    /**
     * Creates new data row
     * @param {Object} params
     */
    createDataItem(params: DataItemParams): void {
        var dataItem = new DataItem(params);
        this.element.appendChild(dataItem.element);
    }
}