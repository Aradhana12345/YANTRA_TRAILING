/**
 * @NApiVersion 2.0
 * @NScriptType plugintypeimpl
 */
define(['N/plugin'],
    /**
     * @param {plugin} plugin
     */
    function(plugin) {

        return {
            doTheMagic: function(operand1, operand2) {
                return operand1 + operand2;
            }
        };

    });