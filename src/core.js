/**
 * ApolloVue version 1.0.1
 */
(function(){
/** MIXIN-INJECT:START **/
/** MIXIN-INJECT:END **/

    /**
     * all privates data and functions
     * @private
     */
    var _private = {
        /**
         * config object for the apollo vuew object.
         * @attr http {function) method to fetch resources from the server. if this is not provided the default
     * jQuery.GET will be used default values. the method needs to return a Promise.
     *
         * @attr templateId2URL {function} method to convert a template id to a template URL. if this is not provided
         * the default wil be id => /id. the method gets the template id and needs to return the URL for the template.
         *
         * @attr noLog {bool} set this to true to turn off all logs
         *
         * @attr dataProviders {object} a key-value map where keys are the data providers names and the value
         * are either functions or objects which expose the load method. in case this is an object, and it has the data property
         * so if this is a funciton it should return the data, and if this is not a function this will be considered to be the data.
         *
         * @attr defaultDataProvider {function|object} in case you want to have some default data provider
         * for all the data providers which were not registered.
         *
         * @attr dataProviderName2Obj {function) if this is provided, this method will be called in case a data provider name
     * is not found in the registered data providers, and there is no defaultDataProvider set. the method which will
     * be called wil get the data provider name and should return the data provider object/function.
     *
         * @attr dataProviderNamespace {string|window} set a namespace to an object which is a key-value map for all
         * the data providers. for example "company.data.providers" will make the ApolloVie to check in window.company.data.providers
         * if the data provider is defined there. this could also be the window object to set the data providers in the global scope (although is not recommended)
         *
         * @attr dataSyncPattern {RegExp|String} set a regular expression object or a string to tell ApolloVue the pattern of the property name
         * which should be synced. for example set it to /^dataSync/ to sync all properties which starts with "dataSync" for this.dataSyncName will be synced
         * but this.syncData will not.
         *
         * @attr globalMixins {function) when a new component is created using ApolloV.components.create the method
     * will inject each component with some global mixins which will be returned by this method. Use this method
     * to control some default mixins for all project or set of components. the method will get as a parameter the
     * component name.
     *
         * @attr debug {bool} if this is true additional debug logs will be sent to the console.log
         */
        config : null,

        /**
         * we want to allow components to register and trigger data change events between components.
         * this object is a key-value map where the key is the data property name and the value is an array of
         * all the vue components which listning to the event.
         */
        watchers: {},

        /**
         * since we don't want to have a case where the same event is firing with the same data in a short period of time
         * we keep for each data property name the last time it was fired and the last value.
         */
        lastWatchData:{},

        /**
         * data providers are object which are responsible to load data for components.
         */
        dataProviders : {},

        CONST: {
            EVENT_TYPE_LISTENER:  1,
            EVENT_TYPE_TRIGGER:   2,
            EVENT_TYPE_BOTH:      3
        },

        init: function(){
            //checking to see if some config was set
            _private.config = {};
            _private.log('initializing...');
            if( window.ApolloVConfig ){
                _private.log('found global config object');
                _private.config = window.ApolloVConfig;
            }

            //checking to see if we have in the config data providers
            if( _private.config.dataProviders ){
                _private.dataProviders = _private.config.dataProviders;
            }
        },

        /**
         * allow for a vue object to register for a property change
         * @param vueObj
         * @param propertyName
         * @param cb
         */
        registerForPropertyChange: function(vueObj,propertyName,cb){
            if( !_private.watchers[propertyName] ){
                _private.watchers[propertyName] = [];
                _private.lastWatchData[propertyName] = {time:0,value:null};
            }
            _private.watchers[propertyName].push({vue:vueObj,propertyName:propertyName,watchFn:cb});
        },

        /**
         * Firing an event to all the registered vue components.
         * @param vueObj
         * @param propertyName
         * @param newValue
         * @param oldValue
         */
        reportPropertyChanged: function(vueObj,propertyName,newValue,oldValue){
            if( !_private.watchers[propertyName] ){
                //nobody registered for this event.
                return;
            }

            var now = (new Date()).getTime();
            if( !_private.lastWatchData[propertyName] ){
                _private.lastWatchData[propertyName] = {time:0,value:null};
            }

            //making sure we don't fire the same event in a small period of time with the same value
            //this will prevent an endless loop of events.
            if( _private.isValueEquals(newValue,_private.lastWatchData[propertyName].value,true) &&
                now - _private.lastWatchData[propertyName].time < 500 ){
                _private.debug('ignoring the data sync event since it is the same data in short period of time','DataSyncMixin');
                return;
            }

            for( var i=0; i<_private.watchers[propertyName].length; i++ ){
                if( vueObj !== _private.watchers[propertyName].vue ){
                    _private.watchers[propertyName][i].watchFn(propertyName,newValue,oldValue);
                }
            }
            //saving the last value with current time.
            _private.lastWatchData[propertyName] = {time:now,value:newValue};
        },

        /**
         * this method checks if 2 variable are the equal.
         *
         * @param value1
         * @param value2
         * @param jsonCompare
         * @returns {boolean}
         */
        isValueEquals: function(value1,value2,jsonCompare){
            switch( typeof value1 ){
                case 'string':
                case 'number':
                case 'boolean':
                    return value1 === value2
            }
            if( !value1 ) return value1 === value2;

            if( value1 === value2 ) return true;

            if( !jsonCompare ){
                return false;
            }
            return JSON.stringify(value1) === JSON.stringify(value2);
        },

        getComponentTagName: function(vue){
            if( vue.$options && vue.$options.el && vue.$options.el.tagName ){
                return vue.$options.el.tagName.toLowerCase();
            }
            return "n/a";
        },

        kebabToCamel: function(kebab){
            var arr = kebab.split("-");
            var camel = arr[0];
            for(var i=1; i<arr.length; i++ ){
                camel += _private.capitalize(arr[i]);
            }
            return camel;
        },

        capitalize: function(str){
            return str.substr(0,1).toUpperCase() + str.substr(1);
        },


        log: function(msg){
            if( window.console && window.console.log && !_private.config.noLog ){
                console.log('[ApolloV Info] ' + msg );
            }
        },

        warn: function(msg,e){
            if( window.console && window.console.warn && !_private.config.noLog ){
                console.warn('[ApolloV warn] ' + msg );
                console.warn((e || new Error('Warning Stack Trace')).stack);
            }
        },

        debug: function(msg,module){
            module = module || 'Global';
            if( window.console && window.console.log && _private.config.debug ){
                console.log('[ApolloV Debug|'+module+'] ' + msg );
            }
        },

        isMixinExist: function (mixins, mixinToCheck) {
            for (var i = 0; i < mixins.length; i++) {
                if (mixins[i] === mixinToCheck) {
                    return true;
                }
            }
            return false;
        },

        http: function(url){
            return new Promise( function(resolve,reject){
                if( _private.config.http ){
                    _private.config.http(url).then( function(data){
                        resolve(data);
                    }.bind(this));
                }
                else if( window.jQuery ){
                    window.jQuery.ajax({
                        method : "GET",
                        url: url,
                        success: function(data,textStatus,jqXHR){
                            resolve(data);
                        }.bind(this)
                    });
                }
                else{
                    _private.warn("can't make HTTP request. Either use jquery or set in the config the http property.")
                }

            }.bind(this));
        },

        getTemplateUrl: function(templateId){
            if( _private.config.templateId2URL ){
                return _private.config.templateId2URL(templateId);
            }
            return '/' + templateId;
        },


        getDataProvidersNamespaceObj: function(){
            var namespace = _private.config.dataProviderNamespace;
            if( !namespace ) return null;
            if( typeof namespace !== 'string' ){
                return namespace;
            }

            if( namespace === 'window' ) return window;
            var arr = namespace.split(".");
            var currentPath = "";
            var root = window;
            var startIndex = 0;
            if( arr[0] === 'window' ) startIndex = 1; //we skip the window
            for( var i=startIndex; i<arr.length; i++ ){
                currentPath += (currentPath.length?".":"")+arr[i];
                if( !root[arr[i]] ){
                    _private.warn('failed to reach data provider namespace, couldn\'t find '+currentPath);
                    return null;
                }
                root = root[arr[i]];
            }
            return root;
        },

        /**
         * when a component has the data provider mixin it has the attribute data-provider with a string
         * to the data provider name. this method try to map the name to an actual data provider object/function
         * according to several configuration options.
         * @param name
         * @returns {*}
         */
        getDataProviderObject: function(name){
            if( !name || !name.length ){
                _private.warn('please provide data provider name');
                return null;
            }
            var obj;
            if( !_private.dataProviders[name] ){
                if( _private.config.dataProviderName2Obj ){
                    obj = _private.config.dataProviderName2Obj(name);
                    if( obj ){
                        return obj;
                    }
                    _private.log('dataProviderName2Obj return null for '+name);
                }

                //maybe we can find the data provider in the provided namespace
                var root = _private.getDataProvidersNamespaceObj()
                if( root && root[name] ){
                    return root[name];
                }

                if( _private.config.defaultDataProvider ){
                    return _private.config.defaultDataProvider;
                }

                _private.warn('there is no data provider matching the name '+ name );
                return null;
            }
            return _private.dataProviders[name];
        },

        injectGlobalMixins: function(obj,tagName){
            //adding the pre-define  mixins
            if (!obj.mixins) {
                obj.mixins = [];
            }

            //we want to enforce some order of the mixins, so first we make sure the global mixins are applied.
            var originalMixins = obj.mixins;

            //global mixins which will be added to this component
            var globalMixins = [];
            if( _private.config.globalMixins ){
                if( typeof _private.config.globalMixins !== 'function' ){
                    _private.warn('globalMixins was defined in the config but it is not a function so it is ignored');
                }
                else{
                    var gm = _private.config.globalMixins(tagName);
                    if( gm && gm.length ){
                        //going through the mixins to make sure they are valid
                        for( var i=0; i<gm.length; i++ ){
                            if( !gm[i] ){
                                _private.warn('undefined mixin returned by globalMixins function (index '+i+')');
                            }
                            else{
                                globalMixins.push(gm[i]);
                            }
                        }
                    }
                }
            }

            obj.mixins = globalMixins;

            for (var i = 0; i < originalMixins.length; i++) {
                //making sure the mixin is not already there
                if (!_private.isMixinExist(obj.mixins, originalMixins[i])) {
                    obj.mixins.push(originalMixins[i]);
                }
            }
        }
    };

    var ApolloV = {

        config: {
            setConfig: function (config) {
                _private.config = config;
            }
        },

        mixins: {
            asyncInit: AsyncInitMixin,
            template: TemplateMixin,
            dynamicTemplate: DynamicTemplateMixin,
            dataProvider: DataProviderMixin,
            events: EventsMixin,
            dataSync: DataSyncMixin
        },

        templates: {
            load: function (templateId) {
                return new Promise(function (resolve, reject) {
                    _private.http(_private.getTemplateUrl(templateId)).then(function (html) {
                        resolve(html);
                    }.bind(this));
                }.bind(this));
            }
        },

        data: {
            registerProvider: function(name,provider){
                if( _private.dataProviders[name] ){
                    _private.log('overriding existing data provider '+name);
                }
                _private.dataProviders[name] = provider;
            }
        },

        components: {

            /**
             * this method goes over all the DOM and replace components tags into Vue components
             * by initializing them.
             * This method should be called if a component tag was inserted into the DOM dynamically.
             *
             * @param root {String|DOMElement} (optional) css selector or an actual element for the root element
             *  which the searching of the components tag will be done. if not provided it will use the body as the root.
             */
            render: function (root) {
                root = root || "body";
                var $root = $(root);
                var selector = Object.keys(Vue.options.components);
                $root.find(selector.toString()).each(function (index, elm) {
                    var tag = elm.tagName.toLowerCase();
                    new Vue.options.components[tag]({el: elm});
                }.bind(this));
            },

            /**
             * creating a new component.
             * @param obj {Object} the Vue extend object
             * @param tagName {String}
             * @returns {*}
             */
            create: function (tagName,obj) {
                if( typeof tagName !== 'string' && !obj ){
                    obj = tagName;
                    tagName = null;
                }

                //in case the obj is a resolve function
                if( typeof obj === 'function' ){
                    Vue.component(tagName, function(resolve){
                        obj(function(_obj){
                            _private.injectGlobalMixins(_obj,tagName)
                            resolve(_obj);
                        });
                    }.bind(this));
                    return;
                }

                _private.injectGlobalMixins(obj,tagName);
                var vueObj = Vue.extend(obj);

                //register the object as tag
                if (tagName) {
                    Vue.component(tagName, vueObj);
                }
                return vueObj;
            }
        }
    };

    //initializing
    _private.init();

    //exposing the lib
    window.ApolloV = ApolloV;

})();