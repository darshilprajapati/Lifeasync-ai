export default async function handler(req, res) {
  try {
    const backendUrl = process.env.VITE_API_URL || process.env.BACKEND_URL || 'https://lifesync-api-3x29.onrender.com';
    const secretKey = process.env.KeepAliveSettings__SecretKey || process.env.KEEPALIVE_SECRET || 'LifeSync_KeepAlive_Secret_2026_Key!';

    console.log(`[Vercel Cron] Triggering daily keep-alive: ${backendUrl}/api/system/keep-alive`);

    const response = await fetch(`${backendUrl.replace(/\/$/, '')}/api/system/keep-alive`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-KeepAlive-Key': secretKey,
        'User-Agent': 'Vercel-Cron-KeepAlive/1.0'
      }
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text.slice(0, 300) };
    }

    return res.status(200).json({
      success: response.ok,
      status: response.status,
      timestamp: new Date().toISOString(),
      backendResponse: data
    });
  } catch (error) {
    console.error('[Vercel Cron Error]', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
