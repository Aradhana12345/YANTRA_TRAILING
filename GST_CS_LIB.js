/**
 * @NApiVersion 2.x
 * @NModuleScope SameAccount
 */
define(['N/runtime'],
    /**
     * @param {runtime} runtime
     */
    function(runtime) {

        function getSubsidiary() {

            var scriptObj = runtime.getCurrentScript();
            var subsidiary = scriptObj.getParameter({
                name: 'custscript_cs_gst_sub_id'
            });
            log.debug("Script parameter of custscript1: " + subsidiary);

            return {
                id: subsidiary
            };

        }
        return {
            getSubsidiary: getSubsidiary
        };

    });