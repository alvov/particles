var timer = null;

self.addEventListener('message', function(e) {
    switch (e.data) {
        case 'start':
            timer = setInterval(function() {
                postMessage('tick');
            }, 1000);
            break;
        case 'stop':
            clearInterval(timer);
            break;
    }
});
