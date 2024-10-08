import {
  _extension,
  UiIcons,
  UiList,
  UiListItem,
  UiImage,
} from '@altdot/extension';
import { useEffect, useState, useCallback } from 'react';
import { formatBytes } from './utils/helper';
import { ProcessItem } from './interfaces/process.interface';

function ListProcess() {
  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [status, setStatus] = useState<'idle' | 'error' | 'loading'>('loading');

  async function killProcess(processName: string) {
    try {
      const processItem = processes.find(
        (item) => item.processName === processName,
      );
      if (!processItem) return;

      _extension.viewAction.sync.sendMessage(
        'process:kill',
        processItem.processName,
      );

      setProcesses(
        processes.filter(
          (item) => item.processName !== processItem.processName,
        ),
      );
      _extension.ui.showToast({
        title: `"${processItem.name}" process killed`,
      });
    } catch (error) {
      _extension.ui.showToast({
        type: 'error',
        title: 'Something went wrong!',
        description: (error as Error).message,
      });
    }
  }

  const loadProsses = useCallback((isReload?: boolean) => {
    const toast = isReload
      ? _extension.ui.createToast({
          type: 'loading',
          title: 'Reloading...',
        })
      : null;
    toast?.show();

    _extension.viewAction.async
      .sendMessage('process:get-all')
      .then((items) => {
        setProcesses(items?.sort((a, z) => z.memory - a.memory) ?? []);
        setStatus('idle');
        toast?.hide();
      })
      .catch((error) => {
        toast?.hide();
        _extension.ui.showToast({
          type: 'error',
          description: error.message,
          title: 'Something when wrong!',
        });
        setStatus('error');
      });
  }, []);

  const listItems: UiListItem[] = processes.map((item) => ({
    icon: (
      <UiImage
        loading="lazy"
        style={{ height: '100%', width: '100%' }}
        src={_extension.runtime.getFileIconURL(encodeURIComponent(item.path))}
      />
    ),
    title: item.name,
    value: item.processName,
    subtitle: item.name === item.processName ? '' : item.processName,
    group: `Running processes (${processes.length})`,
    actions: [
      {
        type: 'button',
        value: 'open-location',
        icon: UiIcons.FolderOpen,
        title: 'Open file location',
        onAction() {
          _extension.shell.showItemInFolder(item.path);
        },
      },
      {
        type: 'button',
        value: 'reload',
        title: 'Reload',
        icon: UiIcons.RotateCw,
        shortcut: { key: 'r', mod1: 'ctrlKey' },
        onAction() {
          loadProsses(true);
        },
      },
    ],
    suffix: (
      <span
        className="text-muted-foreground text-xs"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {formatBytes(item.memory, 1)} ｜ {item.cpu}%
      </span>
    ),
  }));

  useEffect(() => {
    loadProsses();
  }, [loadProsses]);

  if (status === 'error') {
    return (
      <p className="p-4 text-center text-destructive-text">
        Error when fetching processes
      </p>
    );
  }

  if (status === 'loading') {
    return (
      <p className="p-4 text-center text-muted-foreground">
        Fetching processes...
      </p>
    );
  }

  return (
    <div className="p-2">
      <UiList items={listItems} onItemSelected={killProcess} />
    </div>
  );
}

export default ListProcess;
