export declare const DefaultBridgeServerPort = 3766;
export declare const DefaultLocalEndpoint = "http://127.0.0.1:3766";
export declare const BridgeCallTimeout = 30000;
export declare enum BridgeEvent {
    Call = "bridge-call",
    CallResponse = "bridge-call-response",
    UpdateAgentStatus = "bridge-update-agent-status",
    Message = "bridge-message",
    Connected = "bridge-connected",
    Refused = "bridge-refused",
    ConnectNewTabWithUrl = "connectNewTabWithUrl",
    ConnectCurrentTab = "connectCurrentTab",
    GetBrowserTabList = "getBrowserTabList",
    SetDestroyOptions = "setDestroyOptions",
    SetActiveTabId = "setActiveTabId"
}
export declare const BridgeSignalKill = "MIDSCENE_BRIDGE_SIGNAL_KILL";
export interface BridgeConnectTabOptions {
    /**
     * If true, the page will always track the active tab.
     * @default true
     */
    forceSameTabNavigation?: boolean;
}
export declare enum MouseEvent {
    PREFIX = "mouse.",
    Click = "mouse.click",
    Wheel = "mouse.wheel",
    Move = "mouse.move",
    Drag = "mouse.drag"
}
export declare enum KeyboardEvent {
    PREFIX = "keyboard.",
    Type = "keyboard.type",
    Press = "keyboard.press"
}
export declare const BridgePageType = "page-over-chrome-extension-bridge";
export declare const BridgeErrorCodeNoClientConnected = "no-client-connected";
export interface BridgeCall {
    id: string;
    method: string;
    args: any[];
    response: any;
    createTime: number;
    callTime: number;
    responseTime: number;
    callback: (error: Error | undefined, response: any) => void;
    error?: Error;
}
export interface BridgeCallRequest {
    id: string;
    method: string;
    args: any[];
}
export interface BridgeCallResponse {
    id: string;
    response: any;
    error?: any;
}
export interface BridgeConnectedEventPayload {
    version: string;
}
