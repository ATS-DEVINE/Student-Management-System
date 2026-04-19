(function bootstrapStudentApp() {
    const API_BASE = '/api/students';

    async function parseResponse(response) {
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            return response.json();
        }

        const text = await response.text();
        return { success: false, message: text || 'Unexpected server response.' };
    }

    async function request(method, url, body) {
        const options = { method, headers: {} };

        if (body !== undefined) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        const payload = await parseResponse(response);

        if (!response.ok || payload.success === false) {
            throw new Error(payload.message || `Request failed (${response.status})`);
        }

        return payload;
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    function formatDate(dateInput) {
        if (!dateInput) {
            return '-';
        }

        const parsed = new Date(dateInput);
        if (Number.isNaN(parsed.getTime())) {
            return '-';
        }

        return parsed.toLocaleDateString();
    }

    function renderMessage(element, type, message) {
        if (!element) {
            return;
        }

        element.innerHTML = `<div class="message ${type}">${escapeHtml(message)}</div>`;
    }

    function clearMessage(element) {
        if (!element) {
            return;
        }

        element.innerHTML = '';
    }

    window.StudentApp = {
        api: {
            list(searchTerm = '') {
                const search = String(searchTerm || '').trim();
                const url = search ? `${API_BASE}?search=${encodeURIComponent(search)}` : API_BASE;
                return request('GET', url);
            },
            getById(id) {
                return request('GET', `${API_BASE}?id=${encodeURIComponent(id)}`);
            },
            create(student) {
                return request('POST', API_BASE, student);
            },
            update(id, student) {
                return request('PUT', `${API_BASE}?id=${encodeURIComponent(id)}`, student);
            },
            remove(id) {
                return request('DELETE', `${API_BASE}?id=${encodeURIComponent(id)}`);
            }
        },
        utils: {
            clearMessage,
            escapeHtml,
            formatDate,
            renderMessage
        }
    };
})();
