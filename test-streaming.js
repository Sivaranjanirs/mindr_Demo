// Test script for streaming improvements
// Run with: node test-streaming.js

const controller = new AbortController();

async function testStreaming() {
    console.log('Testing streaming with AbortController and heartbeat handling...');
    
    try {
        const response = await fetch('http://localhost:8000/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: 'Tell me about nutrition tips' }),
            signal: controller.signal
        });

        console.log('Response headers:');
        for (const [key, value] of response.headers.entries()) {
            console.log(`  ${key}: ${value}`);
        }

        if (!response.body) {
            throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let tokenCount = 0;
        let heartbeatCount = 0;

        console.log('\nStreaming response:');
        const startTime = Date.now();

        while (true) {
            const { value, done } = await reader.read();
            
            if (done) {
                console.log('\nStream completed successfully');
                break;
            }

            buffer += decoder.decode(value, { stream: true });

            let eventEnd;
            while ((eventEnd = buffer.indexOf('\n\n')) !== -1) {
                const event = buffer.slice(0, eventEnd);
                buffer = buffer.slice(eventEnd + 2);

                // Check for heartbeat comments
                if (event.startsWith(':')) {
                    heartbeatCount++;
                    console.log(`[HEARTBEAT ${heartbeatCount}]`);
                    continue;
                }

                if (event.startsWith('data: ')) {
                    const payload = event.slice(6);
                    
                    if (payload === '[DONE]') {
                        console.log('\n[STREAM DONE]');
                        reader.releaseLock();
                        return;
                    }

                    try {
                        const obj = JSON.parse(payload);
                        
                        if (obj.token !== undefined) {
                            process.stdout.write(obj.token);
                            tokenCount++;
                        } else if (obj.bullets !== undefined) {
                            console.log('\n\nBullets received:', obj.bullets.length);
                            obj.bullets.forEach((bullet, i) => {
                                console.log(`  ${i + 1}. ${bullet}`);
                            });
                        } else if (obj.sources !== undefined) {
                            console.log('\n\nSources received:', obj.sources.length);
                            obj.sources.forEach((source, i) => {
                                console.log(`  ${i + 1}. ${source.name} (score: ${source.score})`);
                            });
                        }
                    } catch (e) {
                        console.warn('\nFailed to parse payload:', payload, e);
                    }
                }
            }
        }

        const duration = Date.now() - startTime;
        console.log(`\n\nStreaming completed in ${duration}ms`);
        console.log(`Tokens received: ${tokenCount}`);
        console.log(`Heartbeats received: ${heartbeatCount}`);

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('\nStream was aborted by user');
        } else {
            console.error('Stream error:', error);
        }
    }
}

// Test abort functionality after 5 seconds
setTimeout(() => {
    console.log('\nAborted after 5 seconds');
    controller.abort();
}, 5000);

testStreaming().then(() => {
    console.log('Test completed');
    process.exit(0);
}).catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});