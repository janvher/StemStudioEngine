export interface Task<T> {
    run: () => Promise<T>;
    priority: number;
    resolve: (value: T) => void;
    reject: (reason?: any) => void;
}

/**
 * PriorityTaskQueue manages a queue of tasks with associated priorities.
 * It uses a Max-Heap data structure, meaning tasks with higher priority values
 * are processed before tasks with lower priority values.
 */
export class PriorityTaskQueue {
    private queue: Task<any>[] = [];
    private activeTasks = 0;
    private maxConcurrentTasks: number;

    constructor(maxConcurrentTasks: number = 4) {
        this.maxConcurrentTasks = maxConcurrentTasks;
    }

    public enqueue<T>(run: () => Promise<T>, priority: number = 0): Promise<T> {
        return new Promise((resolve, reject) => {
            this.push({
                run,
                priority,
                resolve,
                reject,
            });
            this.processQueue();
        });
    }

    private processQueue() {
        if (this.activeTasks >= this.maxConcurrentTasks || this.queue.length === 0) {
            return;
        }

        this.activeTasks++;
        const task = this.pop();

        if (task) {
            task.run()
                .then(task.resolve)
                .catch(task.reject)
                .finally(() => {
                    this.activeTasks--;
                    this.processQueue();
                });
        }
    }

    private push(item: Task<any>) {
        this.queue.push(item);
        this.bubbleUp(this.queue.length - 1);
    }

    private pop(): Task<any> | undefined {
        if (this.queue.length === 0) return undefined;
        const top = this.queue[0];
        const bottom = this.queue.pop();
        if (this.queue.length > 0 && bottom) {
            this.queue[0] = bottom;
            this.sinkDown(0);
        }
        return top;
    }

    private bubbleUp(index: number) {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            const current = this.queue[index];
            const parent = this.queue[parentIndex];
            
            if (!current || !parent) break;

            if (current.priority <= parent.priority) break;
            
            this.queue[index] = parent;
            this.queue[parentIndex] = current;
            index = parentIndex;
        }
    }

    private sinkDown(index: number) {
        const length = this.queue.length;
        const element = this.queue[index];
        
        if (!element) return;

        while (true) {
            let leftChildIndex = 2 * index + 1;
            let rightChildIndex = 2 * index + 2;
            let leftChild, rightChild;
            let swap = null;

            if (leftChildIndex < length) {
                leftChild = this.queue[leftChildIndex];
                if (leftChild && leftChild.priority > element.priority) {
                    swap = leftChildIndex;
                }
            }

            if (rightChildIndex < length) {
                rightChild = this.queue[rightChildIndex];
                if (rightChild) {
                    if (
                        swap === null && rightChild.priority > element.priority ||
                        swap !== null && leftChild && rightChild.priority > leftChild.priority
                    ) {
                        swap = rightChildIndex;
                    }
                }
            }

            if (swap === null) break;
            
            const swapElement = this.queue[swap];
            if (swapElement) {
                this.queue[index] = swapElement;
                this.queue[swap] = element;
                index = swap;
            } else {
                break;
            }
        }
    }
}
