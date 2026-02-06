// Cloudflare Pages Function for Data Sync
export async function onRequestGet({ request, env }) {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
        return new Response(JSON.stringify({ error: 'userId is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const data = await env.MEAL_DATA.get(`user:${userId}`);
        if (!data) {
            return new Response(JSON.stringify({}), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        return new Response(data, {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestPost({ request, env }) {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
        return new Response(JSON.stringify({ error: 'userId is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await request.json();
        await env.MEAL_DATA.put(`user:${userId}`, JSON.stringify(body));

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
