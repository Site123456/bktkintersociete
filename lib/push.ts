export async function sendPushNotifications(tokens: string[], title: string, body: string, data?: any, silent?: boolean) {
  if (tokens.length === 0) return;

  // Filter out empty or invalid tokens
  const validTokens = tokens.filter(t => t && t.startsWith('ExpoPushToken['));
  if (validTokens.length === 0) return;

  const messages = validTokens.map(token => {
    const message: any = {
      to: token,
      sound: 'default',
      data,
      _contentAvailable: true,
    };

    if (!silent) {
      message.title = title;
      message.body = body;
    }

    return message;
  });

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const resData = await response.json();
    console.log('Expo Push Response:', JSON.stringify(resData));
    return resData;
  } catch (error) {
    console.error('Error sending push notifications:', error);
  }
}
