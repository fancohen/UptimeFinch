const pageConfig = {
  // Title for your status page
  title: "lyc8503's Status Page",
  // Links shown at the header of your status page, could set `highlight` to `true`
  links: [
    { link: 'https://github.com/fancohen', label: 'GitHub' },
    { link: 'https://www.linweifan.com/', label: 'Blog' },
    { link: 'mailto:i@linweifan.com', label: 'Email Me', highlight: true },
  ],
}

const workerConfig = {
  kvWriteCooldownMinutes: 3,
  monitors: [
    {
      id: 'foo_monitor',
      name: 'My API Monitor',
      method: 'POST',
      target: 'https://example.com',
      tooltip: 'This is a tooltip for this monitor',
      statusPageLink: 'https://example.com',
      expectedCodes: [200],
      timeout: 10000,
      headers: {
        'User-Agent': 'Uptimeflare',
        Authorization: 'Bearer YOUR_TOKEN_HERE',
      },
      body: 'Hello, world!',
      responseKeyword: 'success',
      checkLocationWorkerRoute: 'https://xxx.example.com',
    },
    {
      id: 'test_tcp_monitor',
      name: 'Example TCP Monitor',
      method: 'TCP_PING',
      target: '1.2.3.4:22',
      tooltip: 'My production server SSH',
      statusPageLink: 'https://example.com',
      timeout: 5000,
    },
    // 新增的监控项
    {
      id: 'blog_monitor',
      name: 'Blog Monitor',
      method: 'GET',
      target: 'https://www.linweifan.com',
      expectedCodes: [200],
      timeout: 10000,
      tooltip: 'Monitoring my blog',
      statusPageLink: 'https://www.linweifan.com',
    },
    {
      id: 'nextchat_monitor',
      name: 'NextChat Monitor',
      method: 'GET',
      target: 'https://ai.linweifan.com',
      expectedCodes: [200],
      timeout: 10000,
      tooltip: 'Monitoring NextChat',
      statusPageLink: 'https://ai.linweifan.com',
    },
    {
      id: 'lobe_monitor',
      name: 'Lobe Monitor',
      method: 'GET',
      target: 'https://chat.linweifan.com',
      expectedCodes: [200],
      timeout: 10000,
      tooltip: 'Monitoring Lobe',
      statusPageLink: 'https://chat.linweifan.com',
    },
    {
      id: 'oneapi_monitor',
      name: 'OneAPI Monitor',
      method: 'GET',
      target: 'https://api.linweifan.com',
      expectedCodes: [200],
      timeout: 10000,
      tooltip: 'Monitoring OneAPI',
      statusPageLink: 'https://api.linweifan.com',
    },
    {
      id: 'drive_monitor',
      name: 'Drive Monitor',
      method: 'GET',
      target: 'https://drive.linweifan.com',
      expectedCodes: [200],
      timeout: 10000,
      tooltip: 'Monitoring Drive',
      statusPageLink: 'https://drive.linweifan.com',
    },
  ],
  callbacks: {
    onStatusChange: async (
      env,
      monitor,
      isUp,
      timeIncidentStart,
      timeNow,
      reason
    ) => {
      await notify(env, monitor, isUp, timeIncidentStart, timeNow, reason);
    },
    onIncident: async (
      env,
      monitor,
      timeIncidentStart,
      timeNow,
      reason
    ) => {
      // Write any Typescript code here
    },
  },
};

// Below is code for sending Telegram & Bark notification
// You can safely ignore them
const escapeMarkdown = (text: string) => {
  return text.replace(/[_*[\](){}~`>#+\-=|.!\\]/g, '\\$&');
};

async function notify(
  env: any,
  monitor: any,
  isUp: boolean,
  timeIncidentStart: number,
  timeNow: number,
  reason: string,
) {
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  });

  let downtimeDuration = Math.round((timeNow - timeIncidentStart) / 60);
  const timeIncidentStartFormatted = dateFormatter.format(new Date(timeIncidentStart * 1000));
  let statusText = isUp
    ? `The service is up again after being down for ${downtimeDuration} minutes.`
    : `Service became unavailable at ${timeIncidentStartFormatted}. Issue: ${reason || 'unspecified'}`;

  console.log('Notifying: ', monitor.name, statusText);

  if (env.BARK_SERVER && env.BARK_DEVICE_KEY) {
    try {
      let title = isUp ? `✅ ${monitor.name} is up again!` : `🔴 ${monitor.name} is currently down.`;
      await sendBarkNotification(env, monitor, title, statusText);
    } catch (error) {
      console.error('Error sending Bark notification:', error);
    }
  }

  if (env.SECRET_TELEGRAM_CHAT_ID && env.SECRET_TELEGRAM_API_TOKEN) {
    try {
      let operationalLabel = isUp ? 'Up' : 'Down';
      let statusEmoji = isUp ? '✅' : '🔴';
      let telegramText = `*${escapeMarkdown(
        monitor.name,
      )}* is currently *${operationalLabel}*\n${statusEmoji} ${escapeMarkdown(statusText)}`;
      await notifyTelegram(env, monitor, isUp, telegramText);
    } catch (error) {
      console.error('Error sending Telegram notification:', error);
    }
  }
}

export async function notifyTelegram(env: any, monitor: any, operational: boolean, text: string) {
  const chatId = env.SECRET_TELEGRAM_CHAT_ID;
  const apiToken = env.SECRET_TELEGRAM_API_TOKEN;

  const payload = new URLSearchParams({
    chat_id: chatId,
    parse_mode: 'MarkdownV2',
    text: text,
  });

  try {
    const response = await fetch(`https://api.telegram.org/bot${apiToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload.toString(),
    });

    if (!response.ok) {
      console.error(
        `Failed to send Telegram notification "${text}",  ${response.status} ${response.statusText
        } ${await response.text()}`,
      );
    }
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
  }
}

async function sendBarkNotification(env: any, monitor: any, title: string, body: string, group: string = '') {
  const barkServer = env.BARK_SERVER;
  const barkDeviceKey = env.BARK_DEVICE_KEY;
  const barkUrl = `${barkServer}/push`;
  const data = {
    title: title,
    body: body,
    group: group,
    url: monitor.url,
    device_key: barkDeviceKey,
  };

  const response = await fetch(barkUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (response.ok) {
    console.log('Bark notification sent successfully.');
  } else {
    const respText = await response.text();
    console.error('Failed to send Bark notification:', response.status, response.statusText, respText);
  }
}

// Don't forget this, otherwise compilation fails.
export { pageConfig, workerConfig }
