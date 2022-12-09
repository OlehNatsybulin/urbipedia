import {OrgRoamGraphReponse, OrgRoamLink, OrgRoamNode} from "../api";

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

class UrbitClientWrapperImpl implements UrbitClientWrapper {
    listener: UrbitListener | undefined;

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

export function connectUrbitClient(listener: UrbitListener): UrbitClientWrapper {
    urbitClientWrapper.listener = listener;
    setTimeout(() => {
        updateGraphData().catch(console.error);
    }, 1000);

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

export async function urbitCreateFile(name: string, text: string) {
    const newId = nodesCounter++;
    allNodes.push({
        id: String(newId),
        file: name,
        title: name,
        level: 0,
        pos: newId,
        olp: [],
        properties: {},
        tags: [],
        content: text
    });
    updateGraphData().catch(console.error);
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

export function urbitGetNodesCountIds(): Promise<number> {
    return new Promise((resolve, reject) => {
        resolve(nodesCounter);
    });
}

export function urbitGetLinksCountIds(): Promise<number> {
    return new Promise((resolve, reject) => {
        resolve(linksCounter);
    });
}

export function urbitGetFilesList(): Promise<Array<string>> {
    return new Promise((resolve, reject) => {
        const res = Array<string>();
        for (let i = 0; i < allNodes.length; i++) {
            res.push(allNodes[i].file);
        }
        resolve(res);
    });
}

export function urbitGetFileName(id: string): Promise<string> {
    return new Promise((resolve, reject) => {
        for (let i = 0; i < allNodes.length; i++) {
            if (allNodes[i].id == id) {
                resolve(allNodes[i].file);
            }
        }
        reject("id for node not found");
    });
}

export function urbitGetLink(id: string): Promise<OrgRoamLink> {
    return new Promise((resolve, reject) => {
        for (let i = 0; i < allLinks.length; i++) {
            if (allLinks[i].id == id) {
                resolve(allLinks[i]);
            }
        }
        reject("link not found");
    });
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
