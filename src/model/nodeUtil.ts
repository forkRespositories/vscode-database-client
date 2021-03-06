import { Node } from "./interface/node";
import { ConnectionManager } from "../service/connectionManager";
import { SqlDialect } from "@/service/dialect/sqlDialect";
import { ServiceManager } from "@/service/serviceManager";

export abstract class NodeUtil {
    public static of(node: any): Node {
        if (!node) {
            return null;
        }
        if (node && !(node instanceof Node)) {
            node.__proto__ = Node.prototype
        }
        if (node.dialect && !(node.dialect instanceof SqlDialect)) {
            node.dialect = ServiceManager.getDialect(node.dbType)
        }
        return node;
    }

    public static removeParent(nodes: any): any {
        if (!nodes) return null;
        // if is node instance
        if (nodes instanceof Node) {
            return { ...nodes, parent: null };
        }
        // if is node object map
        let result = {};
        for (const nodeKey of Object.keys(nodes)) {
            if (!nodes[nodeKey]) continue;
            result[nodeKey] = { ...nodes[nodeKey], parent: null }
        }
        return result;
    }

    public static getTunnelPort(connectId: string): number {
        return ConnectionManager.getActiveConnectByKey(connectId).ssh.tunnelPort
    }

}