import {OrgRoamGraphReponse, OrgRoamLink, OrgRoamNode} from "../api";
import {Urbit} from "@urbit/http-api";

export interface UrbitListener {
    onEvent(event: any): void;
}

export interface UrbitClientWrapper {
    send(data: string): void;
}

let nodesCounter = 0;
let linksCounter = 0;
const allNodes = new Array<OrgRoamNode>;
const allLinks = new Array<OrgRoamLink>;
const allTags = new Array<string>;

enum UrbitConnectionState {
    UCS_NOT_CONNECTED = 1,
    UCS_CONNECTED,
    UCS_HAS_ERROR,
    UCS_DISCONECTED,
}

class UrbitClientWrapperImpl implements UrbitClientWrapper {
    listener: UrbitListener | undefined;
    urbit: Urbit | undefined;

    connectionState: UrbitConnectionState | undefined;

    send(data: string): void {
        console.log("received data from ws mock", data);
    }
}

const urbitClientWrapper = new UrbitClientWrapperImpl();

async function updateGraphData() {
    const graphdata: OrgRoamGraphReponse = {
        nodes: allNodes,
        links: allLinks,
        tags: allTags,
    };

    const message = {
        type: "graphdata",
        data: graphdata
    };
    const event = {
        data: JSON.stringify(message)
    };
    if (!urbitClientWrapper.listener) {
        throw "urbitClientWrapper not defined";
    }
    urbitClientWrapper.listener.onEvent(event);
}

function createFile(name: string, id: string) {
    allNodes.push({
        id: id,
        file: name,
        title: name,
        level: 0,
        pos: Number.parseInt(id),
        olp: [],
        properties: {},
        tags: [],
        content: ""
    });
}

function deleteFile(id: string) {
    // urbitUpdateTagsToFile(id, []).catch(console.error);
    for (let i = 0; i < allNodes.length; i++) {
        if (allNodes[i].id == id) {
            allNodes.splice(i, 1);
            break;
        }
    }
    for (let i = 0; i < allLinks.length; i++) {
        if (allLinks[i].source == id || allLinks[i].target == id) {
            allLinks.splice(i, 1);
            break;
        }
    }
}

function updateFile(id: string, text: string) {
    for (let i = 0; i < allNodes.length; i++) {
        if (allNodes[i].id == id) {
            allNodes[i].content = text;
        }
    }
}

async function updateNode(data: any) {
    if (data.action == "create") {
        const fileName = await urbitGetFileName(String(data.id));
        createFile(fileName, data.id);
        const content = await urbitGetFileContent(String(data.id));
        updateFile(data.id, content);
    } else if (data.action == "delete") {
        deleteFile(data.id);
    } else if (data.action == "change") {
        const fileName = await urbitGetFileName(String(data.id));
        createFile(fileName, data.id);
        const content = await urbitGetFileContent(String(data.id));
        updateFile(data.id, content);
        // todo tags
    }
    updateGraphData().catch(console.error);
}

async function updateLink(data: any) {
    if (data.action == "create") {
    } else if (data.action == "delete") {
    } else if (data.action == "change") {
        throw new Error("unsupported");
    }
    updateGraphData().catch(console.error);
}

async function syncGraphWithUrbit() {
    if (!urbitClientWrapper
        || !urbitClientWrapper.urbit
        || urbitClientWrapper.connectionState !== UrbitConnectionState.UCS_CONNECTED) {
        throw new Error("not connected to urbit");
    }
    try {
        await urbitClientWrapper.urbit.subscribe({
            app: "zettelkasten",
            path: "/update-nodes",
            event: updateNode,
            err: () => console.error("Subscription rejected"),
            quit: () => console.error("Kicked from subscription"),
        });
        await urbitClientWrapper.urbit.subscribe({
            app: "zettelkasten",
            path: "/update-links",
            event: updateLink,
            err: () => console.error("Subscription rejected"),
            quit: () => console.error("Kicked from subscription"),
        });
    } catch {
        console.error("Subscription failed");
    }
}

export function connectUrbitClient(listener: UrbitListener): UrbitClientWrapper {
    urbitClientWrapper.listener = listener;
    urbitClientWrapper.connectionState = UrbitConnectionState.UCS_NOT_CONNECTED;

    // @ts-ignore
    if (!window.ship) {
        throw new Error("window.ship not defined");
    }

    urbitClientWrapper.urbit = new Urbit("");
    // @ts-ignore
    urbitClientWrapper.urbit.ship = window?.ship;
    urbitClientWrapper.urbit.onOpen = () => {
        urbitClientWrapper.connectionState = UrbitConnectionState.UCS_CONNECTED;
        syncGraphWithUrbit().catch(console.error);
    };
    urbitClientWrapper.urbit.onRetry = () => {
        urbitClientWrapper.connectionState = UrbitConnectionState.UCS_NOT_CONNECTED;
    };
    urbitClientWrapper.urbit.onError = (err) => {
        urbitClientWrapper.connectionState = UrbitConnectionState.UCS_HAS_ERROR;
        console.error('urbit error', err);
    };

    setTimeout(() => {
        const message = {
            type: "variables",
            data: {
                varKey1: "444",
                varKey2: "555",
            }
        };
        const event = {
            data: JSON.stringify(message)
        };
        listener.onEvent(event);
    }, 1000);

    return urbitClientWrapper;
}

export async function urbitCreateFile(name: string) {
    return new Promise((resolve, reject) => {
        if (!urbitClientWrapper
            || !urbitClientWrapper.urbit
            || urbitClientWrapper.connectionState !== UrbitConnectionState.UCS_CONNECTED) {
            reject("not connected to urbit");
            throw "error";
        }
        urbitClientWrapper.urbit.poke({
            app: "zettelkasten",
            mark: "zettelkasten-action",
            json: {"create-file": {name: name}},
            onSuccess: () => resolve({}),
            onError: () => reject("cant create file"),
        });
    });
}

export async function urbitUpdateTagsToFile(id: string, tags: Array<string>) {
    let oldTags = new Array<string>;
    for (let i = 0; i < allNodes.length; i++) {
        if (allNodes[i].id == id) {
            oldTags = allNodes[i].tags;
            allNodes[i].tags = tags;
            break;
        }
    }
    oldTags.map((tag) => {
        let has = false;
        for (let i = 0; i < allNodes.length; i++) {
            const pos = allNodes[i].tags.indexOf(tag);
            if (pos >= 0) {
                has = true;
                break;
            }
        }
        if (!has) {
            const pos = allTags.indexOf(tag);
            if (pos >= 0) {
                allTags.splice(pos, 1)
            }
        }
    });

    tags.map(tag => {
        if (!allTags.includes(tag)) {
            allTags.push(tag);
        }
    });
    updateGraphData().catch(console.error);
}


export async function urbitUpdateFile(id: string, text: string) {
    for (let i = 0; i < allNodes.length; i++) {
        if (allNodes[i].id == id) {
            allNodes[i].content = text;
        }
    }
    updateGraphData().catch(console.error);
}

export async function urbitRenameFile(id: string, name: string) {
    for (let i = 0; i < allNodes.length; i++) {
        if (allNodes[i].id == id) {
            allNodes[i].file = name;
            allNodes[i].title = name;
        }
    }
    updateGraphData().catch(console.error);
}

export async function urbitCreateLinkFileToFile(fromId: string, toId: string) {
    allLinks.push({
        id: String(linksCounter++),
        source: fromId,
        target: toId,
        type: "heading"
    });
    updateGraphData().catch(console.error);
}

export async function urbitDeleteLinkFileToFile(linkId: string) {
    for (let i = 0; i < allLinks.length; i++) {
        if (allLinks[i].id == linkId) {
            allLinks.splice(i, 1);
            break;
        }
    }
    updateGraphData().catch(console.error);
}

export async function urbitDeleteFile(id: string) {
    urbitUpdateTagsToFile(id, []).catch(console.error);
    for (let i = 0; i < allNodes.length; i++) {
        if (allNodes[i].id == id) {
            allNodes.splice(i, 1);
            break;
        }
    }
    for (let i = 0; i < allLinks.length; i++) {
        if (allLinks[i].source == id || allLinks[i].target == id) {
            allLinks.splice(i, 1);
            break;
        }
    }
    updateGraphData().catch(console.error);
}

export function getFileContent(id: string): Promise<string> {
    return new Promise((resolve, reject) => {
        for (let i = 0; i < allNodes.length; i++) {
            if (allNodes[i].id == id) {
                resolve(String(allNodes[i].content));
            }
        }
    });
}

export function urbitGetFileName(id: string): Promise<string> {
    return new Promise((resolve, reject) => {
        for (let i = 0; i < allNodes.length; i++) {
            if (allNodes[i].id == id) {
                resolve(String(allNodes[i].file));
            }
        }
    });
}

export function urbitGetFileContent(id: string): Promise<string> {
    return new Promise((resolve, reject) => {
        for (let i = 0; i < allNodes.length; i++) {
            if (allNodes[i].id == id) {
                resolve(String(allNodes[i].content));
            }
        }
    });
}
