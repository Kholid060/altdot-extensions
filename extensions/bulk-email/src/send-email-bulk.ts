import {
  _extension,
  CommandLaunchBy,
  CommandLaunchContext,
} from '@altdot/extension';
import GMailDriver from './utils/drivers/GMailDriver';
import SheetData from './utils/SheetData';

const driversMap = {
  'mail.google.com': GMailDriver,
};

async function actionCommand({
  args,
  launchBy,
}: CommandLaunchContext<{ filePath: string; sheet?: string }>) {
  try {
    const activeTab = await _extension.browser.tabs.getActive();
    if (!activeTab) throw new Error('No active browser');

    const tabUrl = new URL(activeTab.url);

    const MailDriver = driversMap[tabUrl.hostname as keyof typeof driversMap];
    if (!MailDriver) {
      throw new Error(`"${tabUrl.origin}" website is not supported`);
    }

    const sheetData = await new SheetData(args.filePath, args.sheet).getData();
    if (sheetData.values.length === 0) return;

    const mailDriver = new MailDriver(
      activeTab,
      sheetData.columnsIndex,
      sheetData.values,
    );

    await _extension.ui.closeWindow();
    await mailDriver.start();
  } catch (error) {
    if (launchBy === CommandLaunchBy.WORKFLOW) throw error;

    console.error(error);

    _extension.ui.showToast({
      type: 'error',
      title: (error as Error).message,
    });
  }
}

export default actionCommand;
