/**
 * @fileoverview Exports for the main application binary.
 */
goog.provide('ammi.Main');

goog.require('vis.ui.Main');


var Main = vis.ui.Main;

goog.exportSymbol('ammi.Main', Main);
goog.exportProperty(Main.prototype, 'loadModel', Main.prototype.loadModel);
goog.exportProperty(Main.prototype, 'run', Main.prototype.run);

goog.exportProperty(Main.prototype, 'setFreeze', Main.prototype.setFreeze);
goog.exportProperty(Main.prototype, 'setUseStaticTexture', 
    Main.prototype.setUseStaticTexture);
goog.exportProperty(Main.prototype, 'useShadedMaterial',
    Main.prototype.useShadedMaterial);
goog.exportProperty(Main.prototype, 'removeAllObjects', 
    Main.prototype.removeAllObjects);
