goog.provide('vis.ui.events');
goog.provide('vis.ui.events.EventType');



/**
 * Types of events.
 * @enum {string}
 */
vis.ui.events.EventType = {
    DOWNLOAD_STARTED: 'download_started',
    DOWNLOAD_PROGRESS: 'download_progress',
    DOWNLOAD_COMPLETED: 'download_completed',
    OBJECT_READY: 'object_ready',
    TEXTURE_PROGRESS: 'texture_progress',
    FATAL_ERROR: 'fatal_error'
};