import { NextRequest, NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

// Viktigt: använd Node.js runtime, inte Edge
export const runtime = 'nodejs';

// BigQuery-klient med service account credentials
const getBigQueryClient = () => {
  const credentials = process.env.GCP_SA_JSON 
    ? JSON.parse(process.env.GCP_SA_JSON)
    : {
        type: "service_account",
        project_id: "ga4-453414",
        private_key_id: "10c3c39771632a430d4d9bf191139a1c67e4f90f",
        private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCpVQvHA5nvis0D\noyA5jWw6gM99ALGbnuYCyJlU9JVQKMwZ4rd5eMhK4Z3bdGd9dTglR6M5aG9cuIqp\n0qXR6/0VbgngVBKEXMy4kfPBofAc1yTZcREF77UcpwR2qd0i0SJl8/mKUu9oULC+\nVedABI772IYlFkEFTmBzAWXH9iU+V8ET4OD5ZdDuMZl+EldrVEnwwLUdRQmI2z+p\nN0S8QKAhH34NNFteG+zAYRjQ2q1dzqpDKgnEgn9+ff80wo7Zm/wS4pS/TXZTRCF3\ng0uev31T5Dgr3spyza9fwaYGT7yBlxqgdnko4nRMshbQwaJ5MZQfV/iXg4MACJ7y\nSbyYAXEbAgMBAAECggEADCoT4oQbtt2dxLkfQ4MpVzqRrUUzfR55H5IRkczQPSXx\nI5rp20wV92slz/IYzSZylhsDWshp15taOsDrMJ1nXPa+tuLTQbb47fluLWbYvPmn\nqAc7VdXWiOxmoa+qNyoW8oQIVSuID1JcoA/DwRGSw/zWBiwHF759p0VebnL8UfIV\n20s4j3LV7zlMCB6Pmhs5b12jivcq3CwO4aBVCqzOSH/0ax6PxhzctPRCmsfTasBe\nZ+Tzsa+EgHaOu8AOXzOHrQ/9RE4IXNQTfP3kBPAHC/LvUY20xfPyVMnw3Z/vBd+K\nFGfisjKwRm/9zYcO2CLgMaDNsGfPFedUPmgd7Jx2gQKBgQDlN28Bgl6XVYG1WENw\ncpAcjOajqmZOeHydpvlDI6VIKgH4NCqJFboOZtiHV5K1gslh7w9N/CAaeC4VSrPy\nrKKVccxQ4FY+uP/GE/viKnbk/9+lF5XHXpXuhBfYM5BuevrywZPt4xChI5/+5FE+\nhsANMbI9iKmcvx9YhW5nrKEuawKBgQC9HkoT9I9OXVnNA/RT524SR2jPE+RJWKOh\n6st0fcDrXFmA5UYhMwhSZak3spHMpmWSszASNIaZOelL4duZY3a+QBlmp8IcQl9P\nXjviO0ukExgwhjNaUNyawVSrsvLRTIGff/J4dEovwU7Dcz5YPukioecEubn0TE67\nWNOzfkcUEQKBgE5DjDJ+uh+AAabSuUwmwdANyB5v6zi16Q7HWWq0PBYUydFetntS\nINIUCbDElQJG4s3+m0IsaSXAjTOV6zVb/rN6RKIEx03pSuPuJN4HU8tDFrC/CdQm\nFpl3HtEiYhlnAlJrCEB8fEwY5uNYP+lShza6Fjruc8Nieqh1/smFZw97AoGBAKpY\n1jETYOIdg/3/Sd0p4SPl3qpoKIFIrlvyukC75UIbdSN9YaYV6bEOkVXyKxJD78os\nTWiYl4T9fP80+jE4PoUwB7FH+ripsGA1aYtmDcREzs0mlKsNmyhqbHIcRkvwtfGN\ntkJ5vTk2zlOPQuEKCcWAQC8pfC5pbaGjaU2MuUmBAoGACJUPnvIfZWv4dfKznSlX\nRPajEyurol9odwpQjEf/sWBaxJkm+Jzatuys7OH11eqH3MHQd61LEzyZ6vCVA2Rg\nyK8Xa3WyV6K1OXsO8n1aNCf+DLRSnv89RZX2Z+C/mspz4NGfEZBqkViALGl/JHTU\nui6cP1RHHuHqdTOvagOCEC0=\n-----END PRIVATE KEY-----",
        client_email: "dashboard-riksbyggen@ga4-453414.iam.gserviceaccount.com",
        client_id: "115701732429374181402",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/dashboard-riksbyggen%40ga4-453414.iam.gserviceaccount.com",
        universe_domain: "googleapis.com"
      };

  return new BigQuery({
    projectId: "ga4-453414",
    credentials,
  });
};

export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate } = await request.json();

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    console.log('BigQuery API: Fetching sessions', { startDate, endDate });
    console.log('BigQuery API: Environment check', {
      hasGcpSaJson: !!process.env.GCP_SA_JSON,
      nodeEnv: process.env.NODE_ENV
    });

    const client = getBigQueryClient();

    // Din exakta parameteriserade query
    const query = `
      DECLARE start_date DATE DEFAULT @start_date;
      DECLARE end_date   DATE DEFAULT @end_date;

      SELECT
        FORMAT_DATE('%Y-%m-%d', DATE(TIMESTAMP_MICROS(event_timestamp), 'Europe/Stockholm')) AS date,
        'All' AS channel_group,
        COUNT(*) AS sessions
      FROM \`ga4-453414.analytics_249591466.events_*\`
      WHERE
        -- läs bara tabeller i intervallet (snabbare skann)
        _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', start_date) AND FORMAT_DATE('%Y%m%d', end_date)
        -- rätt dygn i Europe/Stockholm
        AND DATE(TIMESTAMP_MICROS(event_timestamp), 'Europe/Stockholm') BETWEEN start_date AND end_date
        -- räkna sessioner
        AND event_name = 'session_start'
      GROUP BY date
      ORDER BY date
    `;

    // Kör query med parametrar
    const [rows] = await client.query({
      query,
      location: 'EU', // Matcha din dataset-region
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    });

    console.log('BigQuery API: Query successful', {
      rowCount: rows.length,
      totalSessions: rows.reduce((sum, row) => sum + (row.sessions || 0), 0)
    });

    // Konvertera till rätt format
    const sessions = rows.map((row: any) => ({
      date: row.date,
      channel_group: row.channel_group,
      sessions: Number(row.sessions) || 0,
    }));

    return NextResponse.json({
      success: true,
      sessions,
      totalSessions: sessions.reduce((sum, s) => sum + s.sessions, 0),
      queryInfo: {
        startDate,
        endDate,
        rowCount: sessions.length
      }
    });

  } catch (error: any) {
    console.error('BigQuery API Error:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        sessions: []
      },
      { status: 500 }
    );
  }
}
