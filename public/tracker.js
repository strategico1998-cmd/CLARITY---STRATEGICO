(function() {
    // 1. Identificar la configuración del script
    let apiKey = null;

    // Intentar obtener el ID desde el script que lo carga
    const scriptTag = document.currentScript || (function() {
        const scripts = document.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
            if (scripts[i].src && scripts[i].src.includes('tracker.js')) {
                return scripts[i];
            }
        }
        return null;
    })();

    if (scriptTag) {
        // Preferir data-id (más seguro para bundlers)
        apiKey = scriptTag.dataset.id || scriptTag.getAttribute('data-id');
        
        // Fallback a query string (retrocompatibilidad)
        if (!apiKey) {
            try {
                const url = new URL(scriptTag.src);
                apiKey = url.searchParams.get('id');
            } catch(e) {}
        }
    }

    if (!apiKey) {
        console.warn("Clarity Analytics - No se encontró API Key. El tracking no se activará.");
        return;
    }

    // Usar el dominio actual si es posible, o el hardcoded de Supabase
    const ENDPOINT = "https://uxcguzqbzvewrhlxpvug.supabase.co/functions/v1/tracker";
    
    // Identificadores únicos
    const UUID = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    let visitorId = localStorage.getItem("clarity_vid");
    if (!visitorId) { visitorId = UUID(); localStorage.setItem("clarity_vid", visitorId); }
    
    let sessionId = sessionStorage.getItem("clarity_sid");
    if (!sessionId) { sessionId = UUID(); sessionStorage.setItem("clarity_sid", sessionId); }
    
    let maxScroll = 0;

    // Motor de Envío (con soporte keepalive)
    function sendClarityEvent(eventType, metadata = {}) {
        const payload = {
            type: eventType,
            api_key: apiKey,
            visitor_id: visitorId,
            session_id: sessionId,
            url: window.location.href,
            domain: window.location.hostname,
            path: window.location.pathname,
            timestamp: new Date().toISOString(),
            metadata: {
                ...metadata,
                ua: navigator.userAgent,
                screen_w: window.innerWidth,
                screen_h: window.innerHeight,
                lang: navigator.language
            }
        };

        // Fetch asíncrono optimizado
        fetch(ENDPOINT, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
        }).catch(() => { /* Silent fail */ });
    }
    
    // RASTREO AUTOMÁTICO
    
    // 1. Navegación Inicial
    function trackPage() {
        sendClarityEvent('pageview', {
            referrer: document.referrer,
            title: document.title
        });
        maxScroll = 0; // Reset scroll on new pageview
    }

    // 2. Soporte SPA (Single Page Application)
    const originalPushState = history.pushState;
    history.pushState = function() {
        originalPushState.apply(this, arguments);
        trackPage();
    };
    window.addEventListener('popstate', trackPage);

    // 3. Heartbeat (Latido cada 30s)
    setInterval(() => {
        sendClarityEvent('heartbeat', {
            duration: Math.round(performance.now() / 1000),
            scroll: maxScroll
        });
    }, 30000);

    // 4. Click Tracking
    document.addEventListener('click', (e) => {
        const target = e.target.closest('a, button, input[type="submit"], [role="button"]');
        if (!target) return;
        
        sendClarityEvent('click', {
            tag: target.tagName,
            text: target.innerText ? target.innerText.substring(0, 30).trim() : '',
            id: target.id,
            href: target.href,
            x: e.pageX,
            y: e.pageY
        });
    }, { capture: true, passive: true });

    // 5. Scroll Tracking (Throttled)
    let scrollTimeout;
    document.addEventListener('scroll', () => {
        if (!scrollTimeout) {
            scrollTimeout = setTimeout(() => {
                const scrollPct = Math.round((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100);
                if (scrollPct > maxScroll) maxScroll = scrollPct;
                scrollTimeout = null;
            }, 500);
        }
    }, { passive: true });

    // 6. Form Tracking
    document.addEventListener('submit', (e) => {
        // Mapeamos como 'conversion' para la DB
        sendClarityEvent('conversion', {
            type: 'form_submit',
            form_id: e.target.id || e.target.name || 'unnamed_form',
            action: e.target.action
        });
    }, { capture: true, passive: true });

    // Iniciamos al cargar
    if (document.readyState === 'complete') {
        trackPage();
    } else {
        window.addEventListener('load', trackPage);
    }

    console.log("Clarity Tracking Pro Activo - ID: " + apiKey);
})();

