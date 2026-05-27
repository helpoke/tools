/**
 * 示例 JavaScript 代码
 * 展示常见的JavaScript特性和最佳实践
 */

// 常量定义
const APP_NAME = 'Helpoke Tools';
const VERSION = '1.0.0';
const MAX_ITEMS = 100;

// 工具函数库
const Utils = {
    /**
     * 格式化日期
     * @param {Date} date - 日期对象
     * @returns {string} 格式化后的日期字符串
     */
    formatDate: function(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    },

    /**
     * 生成随机ID
     * @param {number} length - ID长度
     * @returns {string} 随机ID
     */
    generateId: function(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    /**
     * 防抖函数
     * @param {Function} func - 要执行的函数
     * @param {number} delay - 延迟时间(ms)
     * @returns {Function} 防抖后的函数
     */
    debounce: function(func, delay) {
        let timer = null;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    },

    /**
     * 深拷贝对象
     * @param {any} obj - 要拷贝的对象
     * @returns {any} 拷贝后的对象
     */
    deepClone: function(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        if (obj instanceof Array) {
            return obj.map(item => Utils.deepClone(item));
        }
        const clone = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clone[key] = Utils.deepClone(obj[key]);
            }
        }
        return clone;
    }
};

// 数据存储类
class DataStore {
    constructor() {
        this.items = [];
        this.listeners = [];
    }

    /**
     * 添加数据项
     * @param {object} item - 数据项
     * @returns {string} 生成的ID
     */
    add(item) {
        if (this.items.length >= MAX_ITEMS) {
            throw new Error('超过最大存储数量限制');
        }
        
        const newItem = {
            id: Utils.generateId(),
            data: item,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        this.items.push(newItem);
        this.notify('add', newItem);
        return newItem.id;
    }

    /**
     * 根据ID获取数据项
     * @param {string} id - 数据项ID
     * @returns {object|null} 数据项
     */
    get(id) {
        return this.items.find(item => item.id === id) || null;
    }

    /**
     * 更新数据项
     * @param {string} id - 数据项ID
     * @param {object} data - 新数据
     * @returns {boolean} 是否更新成功
     */
    update(id, data) {
        const index = this.items.findIndex(item => item.id === id);
        if (index === -1) {
            return false;
        }
        
        this.items[index] = {
            ...this.items[index],
            data: { ...this.items[index].data, ...data },
            updatedAt: new Date()
        };
        
        this.notify('update', this.items[index]);
        return true;
    }

    /**
     * 删除数据项
     * @param {string} id - 数据项ID
     * @returns {boolean} 是否删除成功
     */
    remove(id) {
        const index = this.items.findIndex(item => item.id === id);
        if (index === -1) {
            return false;
        }
        
        const removed = this.items.splice(index, 1)[0];
        this.notify('remove', removed);
        return true;
    }

    /**
     * 获取所有数据项
     * @returns {array} 数据项数组
     */
    getAll() {
        return Utils.deepClone(this.items);
    }

    /**
     * 添加监听器
     * @param {Function} listener - 监听器函数
     */
    subscribe(listener) {
        this.listeners.push(listener);
    }

    /**
     * 通知所有监听器
     * @param {string} action - 操作类型
     * @param {object} data - 数据
     */
    notify(action, data) {
        this.listeners.forEach(listener => {
            try {
                listener(action, data);
            } catch (error) {
                console.error('Listener error:', error);
            }
        });
    }
}

// 异步操作示例
const ApiService = {
    /**
     * 模拟异步获取数据
     * @param {number} delay - 延迟时间(ms)
     * @returns {Promise} 包含模拟数据的Promise
     */
    fetchData: function(delay = 1000) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const mockData = [
                    { id: '1', name: '项目A', status: 'active', progress: 75 },
                    { id: '2', name: '项目B', status: 'pending', progress: 20 },
                    { id: '3', name: '项目C', status: 'completed', progress: 100 }
                ];
                resolve(mockData);
            }, delay);
        });
    },

    /**
     * 模拟提交数据
     * @param {object} data - 要提交的数据
     * @returns {Promise} 提交结果
     */
    submitData: function(data) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (data && data.name && data.name.length > 0) {
                    resolve({ success: true, message: '提交成功', data });
                } else {
                    reject(new Error('数据验证失败'));
                }
            }, 800);
        });
    }
};

// 应用主类
class Application {
    constructor() {
        this.store = new DataStore();
        this.initialize();
    }

    /**
     * 初始化应用
     */
    async initialize() {
        console.log(`[${Utils.formatDate(new Date())}] ${APP_NAME} v${VERSION} 初始化中...`);
        
        try {
            // 加载初始数据
            const initialData = await ApiService.fetchData();
            console.log('初始数据加载成功:', initialData);
            
            // 将数据存入store
            initialData.forEach(item => {
                this.store.add(item);
            });
            
            // 订阅store变化
            this.store.subscribe(this.handleStoreChange.bind(this));
            
            console.log('应用初始化完成');
        } catch (error) {
            console.error('初始化失败:', error);
        }
    }

    /**
     * 处理store变化
     * @param {string} action - 操作类型
     * @param {object} data - 数据
     */
    handleStoreChange(action, data) {
        console.log(`[${Utils.formatDate(new Date())}] 数据变化: ${action}`, data);
    }

    /**
     * 创建新项目
     * @param {string} name - 项目名称
     * @returns {string|null} 项目ID
     */
    createProject(name) {
        try {
            const project = {
                name: name,
                status: 'pending',
                progress: 0,
                tasks: []
            };
            return this.store.add(project);
        } catch (error) {
            console.error('创建项目失败:', error);
            return null;
        }
    }

    /**
     * 更新项目进度
     * @param {string} id - 项目ID
     * @param {number} progress - 进度(0-100)
     * @returns {boolean} 是否成功
     */
    updateProgress(id, progress) {
        const clampedProgress = Math.max(0, Math.min(100, progress));
        return this.store.update(id, { 
            progress: clampedProgress,
            status: clampedProgress === 100 ? 'completed' : clampedProgress > 0 ? 'active' : 'pending'
        });
    }
}

// 模块导出（如果在模块环境中）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Utils,
        DataStore,
        ApiService,
        Application,
        APP_NAME,
        VERSION
    };
}

// 如果在浏览器环境中，挂载到window
if (typeof window !== 'undefined') {
    window.HelpokeExample = {
        Utils,
        DataStore,
        ApiService,
        Application,
        APP_NAME,
        VERSION
    };
}

// 自执行示例（仅在浏览器中运行）
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new Application();
        
        // 示例：创建一个新项目
        setTimeout(() => {
            const projectId = app.createProject('新项目示例');
            if (projectId) {
                console.log('新项目ID:', projectId);
                
                // 更新项目进度
                app.updateProgress(projectId, 50);
            }
        }, 1500);
    });
}