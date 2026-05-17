const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase 配置 - 香港版数据库（需要创建新的 Supabase 项目）
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_HK_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_HK_SUPABASE_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Resend 邮件配置
const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_4J4d9T2Q_6QPUSUUegaUSTUX6Wtrzskgu';
const resend = new Resend(RESEND_API_KEY);

// 通知邮箱
const NOTIFICATION_EMAIL = 'victoriazhang696@gmail.com';

// 管理员账号密码
const ADMIN_USERNAME = '90048253';
const ADMIN_PASSWORD = '362681';

// 密钥用于生成 token
const SECRET_KEY = process.env.SECRET_KEY || 'ai-lobster-hk-secret-key-2026';

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 生成 token
function generateToken() {
    return crypto.createHash('sha256').update(`${ADMIN_USERNAME}${Date.now()}${SECRET_KEY}`).digest('hex');
}

// 验证 token
function verifyToken(token) {
    return token && token.length === 64;
}

// 发送邮件通知
async function sendNotification(data) {
    try {
        const { name, phone, email, timestamp } = data;
        
        const submitTime = new Date(timestamp).toLocaleString('zh-HK', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        await resend.emails.send({
            from: 'AI龍蝦交易系統 <onboarding@resend.dev>',
            to: NOTIFICATION_EMAIL,
            subject: '🦞 新的申請通知 - AI龍蝦交易系統（香港版）',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
                    <div style="background: linear-gradient(135deg, #e94560 0%, #c73659 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                        <h1 style="margin: 0;">🦞 新的申請通知</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">AI龍蝦交易系統（香港版）</p>
                    </div>
                    <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
                        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">您收到一條新的申請信息：</p>
                        
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666; width: 120px;">提交時間</td>
                                <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #333;">${submitTime}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">姓名</td>
                                <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #333;">${name || '未填寫'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">手機號</td>
                                <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #333;">${phone || '未填寫'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; color: #666;">郵箱</td>
                                <td style="padding: 12px 0; color: #333;">${email || '未填寫'}</td>
                            </tr>
                        </table>
                        
                        <div style="margin-top: 30px; text-align: center;">
                            <a href="https://ai-lobster-hk.onrender.com/login.html" style="display: inline-block; background: linear-gradient(135deg, #e94560 0%, #c73659 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">登錄後台查看</a>
                        </div>
                    </div>
                    <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                        © 2026 AI龍蝦交易系統 | Homily Chart Malaysia
                    </div>
                </div>
            `
        });
        
        console.log('郵件通知發送成功');
    } catch (error) {
        console.error('郵件發送失敗:', error);
    }
}

// API: 登录
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const token = generateToken();
        res.json({ success: true, token });
    } else {
        res.json({ success: false, message: '用戶名或密碼錯誤' });
    }
});

// API: 提交申请
app.post('/api/submit', async (req, res) => {
    const { name, phone, email, timestamp } = req.body;

    if (!name || !phone || !email) {
        return res.json({ success: false, message: '請填寫完整信息' });
    }

    try {
        const { data, error } = await supabase
            .from('hk_reservations')
            .insert([
                {
                    name: name || '',
                    phone: phone || '',
                    email: email || '',
                    timestamp: timestamp || new Date().toISOString()
                }
            ]);

        if (error) {
            console.error('Supabase error:', error);
            return res.json({ success: false, message: '提交失敗，請稍後重試' });
        }

        sendNotification({
            name: name || '',
            phone: phone || '',
            email: email || '',
            timestamp: timestamp || new Date().toISOString()
        });

        res.json({ success: true, message: '申請成功' });
    } catch (error) {
        console.error('Error:', error);
        res.json({ success: false, message: '網絡錯誤，請稍後重試' });
    }
});

// API: 获取申请列表（需要登录）
app.get('/api/reservations', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!verifyToken(token)) {
        return res.status(401).json({ success: false, message: '未授權' });
    }

    try {
        const { data, error } = await supabase
            .from('hk_reservations')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error:', error);
            return res.json({ success: false, message: '獲取數據失敗' });
        }

        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Error:', error);
        res.json({ success: false, message: '網絡錯誤' });
    }
});

// API: 记录 WhatsApp 点击
app.post('/api/whatsapp-click', async (req, res) => {
    const { timestamp } = req.body;

    try {
        const { data, error } = await supabase
            .from('hk_whatsapp_clicks')
            .insert([{ timestamp: timestamp || new Date().toISOString() }]);

        if (error) {
            console.error('Supabase error:', error);
            return res.json({ success: false, message: '記錄失敗' });
        }

        res.json({ success: true, message: '記錄成功' });
    } catch (error) {
        console.error('Error:', error);
        res.json({ success: false, message: '網絡錯誤' });
    }
});

// API: 获取 WhatsApp 点击记录（需要登录）
app.get('/api/whatsapp-clicks', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!verifyToken(token)) {
        return res.status(401).json({ success: false, message: '未授權' });
    }

    try {
        const { data, error } = await supabase
            .from('hk_whatsapp_clicks')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error:', error);
            return res.json({ success: false, message: '獲取數據失敗' });
        }

        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Error:', error);
        res.json({ success: false, message: '網絡錯誤' });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服務器運行在端口 ${PORT}`);
});