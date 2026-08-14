module.exports = {
    apps: [{
        name: 'SuperPlugin',
        script: 'index.js',
        cwd: __dirname,
        instances: 1,
        autorestart: true,
        watch: false,
        max_restarts: 10,
        restart_delay: 3000,
        env: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        error_file: './logs/error.log',
        out_file: './logs/output.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss',
        max_memory_restart: '200M',
        windowsHide: true
    }]
};
