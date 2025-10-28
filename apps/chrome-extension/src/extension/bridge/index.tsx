import {
  ApiOutlined,
  ArrowDownOutlined,
  ClearOutlined,
  LoadingOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Button, Input, List, Spin, Switch, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import AutoConnectIcon from '../../icons/auto-connect.svg?react';
import PlayIcon from '../../icons/play.svg?react';
import {
  BridgeConnector,
  type BridgeStatus,
} from '../../utils/bridgeConnector';
import { BridgeConfigManager } from '../../utils/bridgeConfig';
import {
  clearStoredBridgeMessages,
  getBridgeMsgsFromStorage,
  storeBridgeMsgsToStorage,
} from '../../utils/bridgeDB';
import { iconForStatus } from '../misc';

import './index.less';

interface BridgeMessageItem {
  id: string;
  type: 'system' | 'status';
  content: string;
  timestamp: Date;
  time: string;
}

const AUTO_CONNECT_STORAGE_KEY = 'midscene-bridge-auto-connect';

export default function Bridge() {
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>('closed');
  const [messageList, setMessageList] = useState<BridgeMessageItem[]>([]);
  const [showScrollToBottomButton, setShowScrollToBottomButton] =
    useState(false);
  const [autoConnect, setAutoConnect] = useState<boolean>(() => {
    const saved = localStorage.getItem(AUTO_CONNECT_STORAGE_KEY);
    return saved === 'true';
  });

  // Port configuration state
  const [currentPort, setCurrentPort] = useState<number>(() =>
    BridgeConfigManager.loadPort(),
  );
  const [portInputValue, setPortInputValue] = useState<string>(
    currentPort.toString(),
  );
  const [portError, setPortError] = useState<string | null>(null);
  const [portSaved, setPortSaved] = useState(false);
  const [needsRestart, setNeedsRestart] = useState(false);

  const messageListRef = useRef<HTMLDivElement>(null);
  // useRef to track the ID of the connection status message
  const connectionStatusMessageId = useRef<string | null>(null);

  // load messages from storage on component mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const messages = await getBridgeMsgsFromStorage();
        setMessageList(messages as BridgeMessageItem[]);
      } catch (error) {
        console.error('Failed to load bridge messages from storage:', error);
      }
    };

    loadMessages();
  }, []);

  // restore connectionStatusMessageId when initializing
  useEffect(() => {
    if (messageList.length > 0) {
      // find the last status message as the current connection status message
      const lastStatusMessage = messageList
        .slice()
        .reverse()
        .find((msg) => msg.type === 'status');

      // only restore ID when there is an unfinished connection session
      // check if the last message indicates the connection has ended
      if (lastStatusMessage) {
        const lastContent = lastStatusMessage.content.toLowerCase();
        const isConnectionEnded =
          lastContent.includes('closed') ||
          lastContent.includes('stopped') ||
          lastContent.includes('disconnect');

        if (!isConnectionEnded) {
          connectionStatusMessageId.current = lastStatusMessage.id;
        }
      }
    }
  }, [messageList]);

  // save messages to localStorage
  useEffect(() => {
    storeBridgeMsgsToStorage(messageList);
  }, [messageList]);

  const appendBridgeMessage = (content: string) => {
    // if there is a connection status message, append all messages to the existing message
    if (connectionStatusMessageId.current) {
      setMessageList((prev) =>
        prev.map((msg) =>
          msg.id === connectionStatusMessageId.current
            ? {
                ...msg,
                content: `${msg.content}\n${dayjs().format('HH:mm:ss.SSS')} - ${content}`,
                timestamp: new Date(),
                time: dayjs().format('HH:mm:ss.SSS'),
              }
            : msg,
        ),
      );
    } else {
      // create a new message (only when there is no active connection)
      const newMessage: BridgeMessageItem = {
        id: `message-${Date.now()}`,
        type: 'status', // connection session messages are unified as status type
        content: `${dayjs().format('HH:mm:ss.SSS')} - ${content}`,
        timestamp: new Date(),
        time: dayjs().format('HH:mm:ss.SSS'),
      };

      // set the connection status message ID, all subsequent messages will be appended to this message
      connectionStatusMessageId.current = newMessage.id;
      setMessageList((prev) => [...prev, newMessage]);
    }
  };

  const bridgeConnectorRef = useRef<BridgeConnector | null>(
    new BridgeConnector(
      (message, type) => {
        appendBridgeMessage(message);
        if (type === 'status') {
          console.log('status tip changed event', type, message);
        }
      },
      (status) => {
        console.log('status changed event', status);
        setBridgeStatus(status);

        if (status !== 'connected') {
          appendBridgeMessage(`Bridge status changed to ${status}`);
        }
      },
    ),
  );

  useEffect(() => {
    // Auto-connect on component mount if enabled
    if (autoConnect && bridgeStatus === 'closed') {
      startConnection();
    }

    return () => {
      bridgeConnectorRef.current?.disconnect();
    };
  }, []);

  const stopConnection = () => {
    bridgeConnectorRef.current?.disconnect();
  };

  const startConnection = async () => {
    // only reset the connection status message ID when starting a new connection
    if (bridgeStatus === 'closed') {
      connectionStatusMessageId.current = null;
    }
    bridgeConnectorRef.current?.connect();
  };

  const handleAutoConnectChange = (checked: boolean) => {
    setAutoConnect(checked);
    localStorage.setItem(AUTO_CONNECT_STORAGE_KEY, String(checked));
  };

  // Port configuration handlers
  const handlePortChange = (value: string) => {
    setPortInputValue(value);
    setPortSaved(false);

    // Clear error after user starts typing
    if (portError) {
      setPortError(null);
    }

    // Real-time validation
    const port = parseInt(value, 10);
    if (isNaN(port) || !BridgeConfigManager.validatePort(port)) {
      const range = BridgeConfigManager.getPortRange();
      setPortError(`Port must be between ${range.min} and ${range.max}`);
    }
  };

  const handlePortSave = () => {
    const port = parseInt(portInputValue, 10);

    if (!BridgeConfigManager.validatePort(port)) {
      setPortError('Invalid port number');
      return;
    }

    try {
      BridgeConfigManager.savePort(port);
      setCurrentPort(port);
      setPortSaved(true);
      setPortError(null);

      // Show restart message if Bridge is currently running
      if (bridgeStatus === 'connected' || bridgeStatus === 'listening') {
        setNeedsRestart(true);
      }

      // Auto-hide success message after 3 seconds
      setTimeout(() => setPortSaved(false), 3000);
    } catch (error) {
      setPortError(
        error instanceof Error ? error.message : 'Failed to save port',
      );
    }
  };

  const handlePortReset = () => {
    BridgeConfigManager.resetToDefault();
    const defaultPort = BridgeConfigManager.getDefaultPort();
    setCurrentPort(defaultPort);
    setPortInputValue(defaultPort.toString());
    setPortError(null);
    setPortSaved(false);

    if (bridgeStatus === 'connected' || bridgeStatus === 'listening') {
      setNeedsRestart(true);
    }
  };

  // Clear restart flag when Bridge is stopped
  useEffect(() => {
    if (bridgeStatus === 'closed' || bridgeStatus === 'disconnected') {
      setNeedsRestart(false);
    }
  }, [bridgeStatus]);

  // clear the message list
  const clearMessageList = () => {
    setMessageList([]);
    connectionStatusMessageId.current = null;
    clearStoredBridgeMessages();
  };

  // scroll to bottom when component first mounts (if there are messages from localStorage)
  useEffect(() => {
    if (messageList.length > 0 && messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, []); // only run once on mount

  // check if scrolled to bottom
  const checkIfScrolledToBottom = () => {
    if (messageListRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messageListRef.current;

      // if content height is less than or equal to container height, no need to scroll, hide button
      if (scrollHeight <= clientHeight) {
        setShowScrollToBottomButton(false);
        return;
      }

      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px tolerance
      setShowScrollToBottomButton(!isAtBottom);
    }
  };

  // scroll to bottom when message list updated
  useEffect(() => {
    if (messageList.length > 0) {
      if (messageListRef.current) {
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
      }
      // check status after scroll
      checkIfScrolledToBottom();
    }
  }, [messageList]);

  // listen to scroll event
  useEffect(() => {
    const container = messageListRef.current;
    if (container) {
      container.addEventListener('scroll', checkIfScrolledToBottom);
      // initial check
      checkIfScrolledToBottom();
      return () => {
        container.removeEventListener('scroll', checkIfScrolledToBottom);
      };
    }
  }, []);

  // manually scroll to bottom
  const handleScrollToBottom = () => {
    if (messageListRef.current) {
      messageListRef.current.scrollTo({
        top: messageListRef.current.scrollHeight,
        behavior: 'smooth',
      });
      setShowScrollToBottomButton(false);
    }
  };

  let statusIcon;
  let statusTip: string;
  let statusBtn;
  if (bridgeStatus === 'closed') {
    statusIcon = iconForStatus('closed');
    statusTip = 'Closed';
    statusBtn = (
      <Button
        type="primary"
        onClick={() => {
          startConnection();
        }}
      >
        Allow connection
      </Button>
    );
  } else if (bridgeStatus === 'listening' || bridgeStatus === 'disconnected') {
    statusIcon = (
      <Spin
        className="status-loading-icon"
        indicator={<LoadingOutlined spin />}
        size="small"
      />
    );
    statusTip = 'Listening for connection';
    statusBtn = (
      <Button className="stop-button" onClick={stopConnection}>
        Stop
      </Button>
    );
  } else if (bridgeStatus === 'connected') {
    statusIcon = iconForStatus('connected');
    statusTip = 'Connected';

    statusBtn = (
      <Button
        className="stop-button"
        onClick={() => {
          stopConnection();
        }}
      >
        Stop
      </Button>
    );
  } else {
    statusIcon = iconForStatus('failed');
    statusTip = `Unknown Status - ${bridgeStatus}`;
    statusBtn = null;
  }

  return (
    <div className="bridge-mode-container">
      <div className="playground-form-container">
        <div className="form-part" />
        {messageList.length > 0 && (
          <div className="clear-button-container">
            <Button
              size="small"
              icon={<ClearOutlined />}
              onClick={clearMessageList}
              type="text"
              className="clear-button"
            />
          </div>
        )}
        {/* middle dialog area */}
        <div className="middle-dialog-area">
          <div ref={messageListRef} className="info-list-container">
            <div className="mode-header">
              <div className="mode-icon">
                <ApiOutlined style={{ fontSize: '12px' }} />
              </div>
              <h2 className="mode-title">Bridge Mode</h2>
            </div>
            <p className="bridge-mode-description">
              In Bridge Mode, you can control this browser by the Midscene SDK
              running in the local terminal. This is useful for interacting both
              through scripts and manually, or to reuse cookies.{' '}
              <a
                href="https://www.midscenejs.com/bridge-mode-by-chrome-extension"
                target="_blank"
                rel="noreferrer"
              >
                More about bridge mode
              </a>
            </p>

            {/* Port Configuration Section */}
            <div
              style={{
                marginBottom: 16,
                padding: '12px',
                backgroundColor: '#f5f5f5',
                borderRadius: 4,
              }}
            >
              <div
                style={{
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontWeight: 500 }}>
                  <SettingOutlined style={{ marginRight: 4 }} />
                  Bridge Port Configuration
                </span>
                {bridgeStatus === 'connected' && (
                  <span style={{ fontSize: 12, color: '#52c41a' }}>
                    ● Active: {currentPort}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <Input
                    type="number"
                    value={portInputValue}
                    onChange={(e) => handlePortChange(e.target.value)}
                    onBlur={handlePortSave}
                    onPressEnter={handlePortSave}
                    placeholder="3766"
                    disabled={
                      bridgeStatus === 'connected' ||
                      bridgeStatus === 'listening'
                    }
                    status={portError ? 'error' : undefined}
                    addonBefore="Port"
                    style={{ width: '100%' }}
                  />
                  {portError && (
                    <div style={{ fontSize: 12, color: '#ff4d4f', marginTop: 4 }}>
                      {portError}
                    </div>
                  )}
                  {portSaved && !portError && (
                    <div style={{ fontSize: 12, color: '#52c41a', marginTop: 4 }}>
                      ✓ Port saved successfully
                    </div>
                  )}
                  {needsRestart && (
                    <div style={{ fontSize: 12, color: '#fa8c16', marginTop: 4 }}>
                      ⚠️ Restart Bridge to apply new port
                    </div>
                  )}
                </div>

                <Tooltip title="Reset to default (3766)">
                  <Button
                    size="small"
                    onClick={handlePortReset}
                    disabled={
                      bridgeStatus === 'connected' ||
                      bridgeStatus === 'listening'
                    }
                  >
                    Reset
                  </Button>
                </Tooltip>
              </div>

              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 8 }}>
                💡 Tip: Use different ports (3766, 3767, 3768...) for multiple
                Chrome Profiles on the same computer.
              </div>
            </div>

            {messageList.length > 0 && (
              <List
                itemLayout="vertical"
                dataSource={messageList}
                renderItem={(item) => (
                  <List.Item key={item.id} className="list-item">
                    <div className="system-message-container">
                      <div className="mode-header">
                        <div className="mode-icon">
                          <ApiOutlined style={{ fontSize: '12px' }} />
                        </div>
                        <span className="mode-title">Bridge Mode</span>
                      </div>
                      <div className="system-message-content">
                        <div className="message-body">
                          <div className="system-message-text">
                            {item.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </div>
          {/* scroll to bottom button */}
          {messageList.length > 0 && showScrollToBottomButton && (
            <Button
              className="scroll-to-bottom-button"
              type="primary"
              shape="circle"
              icon={<ArrowDownOutlined />}
              onClick={handleScrollToBottom}
              size="large"
            />
          )}
        </div>
      </div>

      {/* bottom buttons */}
      <div className="bottom-button-container">
        {bridgeStatus === 'closed' ? (
          <>
            <div className="auto-connect-container">
              <span className="auto-connect-icon">
                <AutoConnectIcon />
              </span>
              <span className="auto-connect-label">
                Auto allow in Bridge Mode
              </span>
              <Switch
                checked={autoConnect}
                onChange={handleAutoConnectChange}
                size="default"
              />
            </div>
            <Button
              type="primary"
              className="bottom-action-button"
              icon={<PlayIcon />}
              onClick={() => {
                startConnection();
              }}
            >
              Allow Connection
            </Button>
          </>
        ) : (
          <div className="bottom-status-bar">
            <div className="bottom-status-text">
              <span className="bottom-status-icon">{statusIcon}</span>
              <span className="bottom-status-tip">{statusTip}</span>
            </div>
            <div className="bottom-status-divider" />
            <div className="bottom-status-btn">{statusBtn}</div>
          </div>
        )}
      </div>
    </div>
  );
}
