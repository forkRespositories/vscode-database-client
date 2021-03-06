import { DatabaseType, ModelType } from "@/common/constants";
import { Util } from "@/common/util";
import { ConnectionManager } from "@/service/connectionManager";
import { SqlDialect } from "@/service/dialect/sqlDialect";
import { QueryUnit } from "@/service/queryUnit";
import { ServiceManager } from "@/service/serviceManager";
import * as vscode from "vscode";
import { DatabaseCache } from "../../service/common/databaseCache";
import { CopyAble } from "./copyAble";
import { SSHConfig } from "./sshConfig";

export interface SwitchOpt {
    isGlobal?: boolean;
    withDb?: boolean;
    withDbForce?: boolean;
}

export abstract class Node extends vscode.TreeItem implements CopyAble {

    /**
     * using as cache key
     */
    public uid: string;

    public host: string;
    public port: number;
    public user: string;
    public password?: string;
    public database?: string;
    public name?: string;
    public timezone?: string;
    public certPath?: string;
    public includeDatabases?: string;
    public excludeDatabases?: string;

    public global?: boolean;
    public usingSSH?: boolean;
    public ssh?: SSHConfig;
    public dbType?: DatabaseType;
    public dialect?: SqlDialect;

    /**
     * es only
     */
    public scheme: string;

    constructor(uid: string) {
        super(uid)
    }
    copyName(): void {
        Util.copyToBoard(this.label)
    }

    protected init(source: Node) {
        this.host = source.host
        this.port = source.port
        this.user = source.user
        this.password = source.password
        if (!this.database) this.database = source.database
        this.timezone = source.timezone
        this.certPath = source.certPath
        this.ssh = source.ssh
        this.usingSSH = source.usingSSH
        this.scheme = source.scheme
        this.global = source.global
        this.dbType = source.dbType
        this.includeDatabases = source.includeDatabases
        this.excludeDatabases = source.excludeDatabases
        if (!this.dialect && this.dbType != DatabaseType.REDIS) {
            this.dialect = ServiceManager.getDialect(this.dbType)
        }
        if (this.contextValue == ModelType.CONNECTION) {
            this.uid = this.getConnectId()
        } else if (this.contextValue == ModelType.DATABASE) {
            this.uid = `${this.getConnectId({ withDbForce: true })}`
        } else {
            this.uid = `${this.getConnectId({ withDbForce: true })}#${this.label}`
        }
        this.collapsibleState = DatabaseCache.getElementState(this)
    }

    public static nodeCache = {};
    public cacheSelf() {
        if (this.contextValue == ModelType.CONNECTION || this.contextValue == ModelType.ES_CONNECTION) {
            Node.nodeCache[`${this.getConnectId()}`] = this;
        } else if (this.contextValue == ModelType.DATABASE) {
            Node.nodeCache[`${this.getConnectId({ withDbForce: true })}`] = this;
        } else {
            Node.nodeCache[`${this.uid}`] = this;
        }
    }
    public getCache() {
        if (this.database) {
            return Node.nodeCache[`${this.getConnectId({ withDbForce: true })}`]
        }
        return Node.nodeCache[`${this.getConnectId()}`]
    }

    public getByRegion(region?: string): Node {
        if (!region) {
            return Node.nodeCache[`${this.getConnectId({ withDbForce: true })}`]
        }
        return Node.nodeCache[`${this.getConnectId({ withDbForce: true })}#${region}`]
    }

    public getChildren(isRresh?: boolean): Node[] | Promise<Node[]> {
        return []
    }

    public getConnectId(opt?: SwitchOpt): string {

        const targetGlobal = opt?.isGlobal != null ? opt.isGlobal : this.global;
        const prefix = targetGlobal === false ? "workspace" : "global";

        let uid = (this.usingSSH && this.ssh) ? `${prefix}_${this.ssh.host}_${this.ssh.port}_${this.ssh.username}`
            : `${prefix}_${this.host}_${this.port}_${this.user}`;


        if (opt?.withDbForce && this.database) {
            return `${uid}_${this.database}`
        }

        /**
         * mssql and postgres must special database when connect.
         */
        if (opt?.withDb && this.database && (this.dbType == DatabaseType.PG || this.dbType == DatabaseType.MSSQL)) {
            return `${uid}_${this.database}`
        }

        return uid;
    }


    public getHost(): string { return this.usingSSH ? this.ssh.host : this.host }
    public getPort(): number { return this.usingSSH ? this.ssh.port : this.port }
    public getUser(): string { return this.usingSSH ? this.ssh.username : this.user }

    public async execute<T>(sql: string): Promise<T> {
        return (await QueryUnit.queryPromise<T>(await ConnectionManager.getConnection(this), sql)).rows
    }

    public async getConnection() {
        return ConnectionManager.getConnection(this)
    }

    public wrap(origin: string) {
        return Util.wrap(origin, this.dbType)
    }

}
