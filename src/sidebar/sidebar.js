"use strict";


class StorageManager {

    constructor(prefix) {
        this.prefix = prefix;
        this.list = document.getElementById(`${this.prefix}list`);
        this.addButton = document.getElementById(`${this.prefix}addbutton`);
        this.clearButton = document.getElementById(`${this.prefix}clearbutton`);
        this.addListeners();
        // Running updateList in the constructor fails with indexedDB.
        // Working with a refreshAll() call at the end of the script instead.
        // this.updateList().then(result => {
        //     console.log(this.prefix, "init complete", this, result);
        // }, error => {
        //     console.error(this.prefix, "init failed", this, error);
        // });
    }

    clearList() {
        console.log(`${this.prefix} clearing list:`, this.list);
        while (this.list.hasChildNodes())
            this.list.removeChild(this.list.lastChild);
    }

    addListItem(key, value) {
        const li = document.createElement("li");
        li.textContent = `[${key}] ${value}`;
        this.list.appendChild(li);
    }

    async updateList() {
        this.clearList();
        await this.getData().then(dataMap => {
            for (let d of dataMap)
                this.addListItem(d[0], d[1]);
        });
    }

    async getData() {
        console.log(`${this.prefix} DUMMY getData:`, this);
        return new Map();
    }

    async addData() {
        console.log(`${this.prefix} DUMMY addData:`, this);
    }

    async clearData() {
        console.log(`${this.prefix} DUMMY clearData:`, this);
    }

    addButtonClickHandler(event) {
        console.log(`${this.prefix} add button clicked:`, event);
        this.addData().then(this.updateList.bind(this));
    }

    clearButtonClickHandler(event) {
        console.log(`${this.prefix} clear button clicked:`, event);
        this.clearData().then(this.updateList.bind(this));
    }

    addListeners() {
        this.addButton.addEventListener("click", this.addButtonClickHandler.bind(this));
        this.clearButton.addEventListener("click", this.clearButtonClickHandler.bind(this));
    }
}


class StorageLocalManager extends StorageManager {

    constructor() {
        super("storagelocal");
    }

    async getData() {
        const dataMap = new Map();
        const itemCount = parseInt((await browser.storage.local.get("itemCount")).itemCount);
        if (!isNaN(itemCount)) {
            for (let i = 0 ; i < itemCount ; i++) {
                const key = `${i}`;
                const result = await browser.storage.local.get(key);
                dataMap.set(key, result[key]);
            }
        }
        return dataMap;
    }

    async addData() {
        let itemCount = parseInt((await browser.storage.local.get("itemCount")).itemCount);
        if (isNaN(itemCount)) itemCount = 0;
        const update = {};
        update[itemCount] = Date.now();
        update["itemCount"] = (itemCount + 1).toString();
        await browser.storage.local.set(update);
    }

    async clearData() {
        await browser.storage.local.clear();
    }
}


class StorageSyncManager extends StorageManager {

    constructor() {
        super("storagesync");
    }

    async getData() {
        const dataMap = new Map();
        const itemCount = parseInt((await browser.storage.sync.get("itemCount")).itemCount);
        if (!isNaN(itemCount)) {
            for (let i = 0 ; i < itemCount ; i++) {
                const key = `${i}`;
                const result = await browser.storage.sync.get(key);
                dataMap.set(key, result[key]);
            }
        }
        return dataMap;
    }

    async addData() {
        let itemCount = parseInt((await browser.storage.sync.get("itemCount")).itemCount);
        if (isNaN(itemCount)) itemCount = 0;
        const update = {};
        update[itemCount] = Date.now();
        update["itemCount"] = (itemCount + 1).toString();
        await browser.storage.sync.set(update);
    }

    async clearData() {
        await browser.storage.sync.clear();
    }
}


class LocalStorageManager extends StorageManager {

    constructor() {
        super("localstorage");
    }

    async getData() {
        const dataMap = new Map();
        const itemCount = parseInt(localStorage.getItem("itemCount"));
        if (!isNaN(itemCount)) {
            for (let i = 0 ; i < itemCount ; i++) {
                const key = `${i}`;
                const value = localStorage.getItem(key);
                dataMap.set(key, value);
            }
        }
        return dataMap;
    }

    async addData() {
        let itemCount = parseInt(localStorage.getItem("itemCount"));
        if (isNaN(itemCount)) itemCount = 0;
        localStorage.setItem(itemCount.toString(), Date.now());
        localStorage.setItem("itemCount", itemCount + 1);
    }

    async clearData() {
        localStorage.clear();
    }
}


class SessionStorageManager extends StorageManager {

    constructor() {
        super("sessionstorage");
    }

    async getData() {
        const dataMap = new Map();
        const itemCount = parseInt(sessionStorage.getItem("itemCount"));
        if (!isNaN(itemCount)) {
            for (let i = 0 ; i < itemCount ; i++) {
                const key = `${i}`;
                const value = sessionStorage.getItem(key);
                dataMap.set(key, value);
            }
        }
        return dataMap;
    }

    async addData() {
        let itemCount = parseInt(sessionStorage.getItem("itemCount"));
        if (isNaN(itemCount)) itemCount = 0;
        sessionStorage.setItem(itemCount.toString(), Date.now());
        sessionStorage.setItem("itemCount", itemCount + 1);
    }

    async clearData() {
        sessionStorage.clear();
    }
}


class IndexedDBManager extends StorageManager {

    constructor() {
        super("indexeddb");
        this.dbName = "StorageTestDB";
        this.objectStoreName = "StorageTestObjectStore";
    }

    openDB() {
        // This fails when run from the constructor, resolves to a db object with name: undefined.
        return new Promise((resolve, reject) => {
            const openRequest = indexedDB.open(this.dbName);
            openRequest.onupgradeneeded = event => {
                console.log(this.prefix, "openDB onupgradeneeded", event);
                const db = event.target.result;
                const store = db.createObjectStore(this.objectStoreName, {autoIncrement: true});
                // os.createIndex("value", "value", {unique: false});
            };
            openRequest.onversionchange = event => {
                console.log(this.prefix, "openDB onversionchange", event);
            };
            openRequest.onsuccess = event => {
                console.log(this.prefix, "openDB onsuccess", event);
                resolve(event.target.result);
            };
            openRequest.onerror = event => {
                console.error(this.prefix, "openDB onerror", event);
                reject(event.target);
            };
            openRequest.onblocked = event => {
                console.error(this.prefix, "openDB onblocked", event);
                reject(event.target);
            };
        });
    }

    getData() {
        return new Promise((resolve, reject) => {
            this.openDB().then(db => {
                console.log(this.prefix, "getData db", db);
                const dataMap = new Map();
                const trans = db.transaction(this.objectStoreName, "readonly");
                const request = trans.objectStore(this.objectStoreName).getAll();
                trans.oncomplete = event => {
                    console.log(this.prefix, "getData transaction oncomplete", event);
                    event.target.db.close();
                    resolve(dataMap);
                };
                request.onerror = event => {
                    console.error(this.prefix, "getData request onerror", event);
                    event.target.transaction.db.close();
                    reject(event.target);
                };
                request.onsuccess = event => {
                    console.log(this.prefix, "getData request onsuccess", event);
                    const result = event.target.result;
                    result.forEach( (obj, key) => {
                        console.log(this.prefix, "getData request onsuccess element", key, obj.value);
                        dataMap.set(key.toString(), obj.value.toString());
                    });
                };
            });
        });
    }

    addData() {
        return new Promise((resolve, reject) => {
            this.openDB().then(db => {
                console.log(this.prefix, "addData db", db);
                const trans = db.transaction(this.objectStoreName, "readwrite");
                const request = trans.objectStore(this.objectStoreName).add({value: Date.now()});
                trans.oncomplete = event => {
                    console.log(this.prefix, "addData transaction oncomplete", event);
                    event.target.db.close();
                    resolve(event.target);
                };
                request.onsuccess = event => {
                    console.log(this.prefix, "addData request onsuccess", event);
                };
                request.onerror = event => {
                    console.error(this.prefix, "addData request onerror", event);
                    event.target.transaction.db.close();
                    reject(event.target);
                };
            });
        });
    }

    clearData() {
        return new Promise((resolve, reject) => {
            const openRequest = indexedDB.deleteDatabase(this.dbName);
            openRequest.onsuccess = (event) => {
                console.log(this.prefix, "clearData onsuccess", event);
                resolve(event.target);
            };
            openRequest.onerror = (event) => {
                console.error(this.prefix, "clearData onerror", event);
                reject(event.target);
            }
        });
    }
}


// class CookiesManager extends StorageManager {
//     constructor() {
//         super("cookies");
//     }
//     async updateList() {
//     }
// }


const slm = new StorageLocalManager();
const ssym = new StorageSyncManager();
const lsm = new LocalStorageManager();
const ssm = new SessionStorageManager();
const idbm = new IndexedDBManager();
// const cm = new CookiesManager();

function refreshAll() {
    slm.updateList();
    ssym.updateList();
    lsm.updateList();
    ssm.updateList();
    idbm.updateList();
    // cm.updateList();
}

const refreshButton = document.getElementById("refreshbutton");
refreshButton.addEventListener("click", refreshAll);

refreshAll();