(function(){

    /**
     * AsyncInitMixin Mixin
     * Use this mixin for a component which needs to do some async processing before rendering.
     * When the component is ready it should call the resolveInit method.
     * If the component should be hidden in absolute position, the component needs to set the asyncType="absolute"
     */
    var AsyncInitMixin = {
        data: function(){
            return {
                //who ever is using this mixin will have a flag to indicate this component is async
                asyncInit: true
            }
        },

        compiled: function(){
            //if the component is setting the  asyncType to be true, we also set the position to absolute.
            //this is effective if we don't want to take space in the page while rendering is not complete.
            if( this.asyncType === 'absolute'){
                $(this.$el).css({"position":"absolute"});
            }
            $(this.$el).css({"visibility":"hidden"});
        },

        methods: {
            resolveInit: function(){
                if( this.asyncType === 'absolute'){
                    $(this.$el).css({"position":""});
                }
                $(this.$el).css({"visibility":""});
            }
        }
    };

    /**
     * Template mixin adds the templates property and replace the template
     * option in case the component tag has the templates attribute. This allows
     * to override the default template.
     */
    var TemplateMixin = {
        props: ['templates'],

        created: function(){
            if( this.templates && this.templates.length ){
                var name = _private.getComponentTagName(this);
                _private.debug('found templates attribute for ' + name ,'TemplateMixin');
                this.templates = this.templates.split(",");

                //override the template id
                this.$options.template = "#"+this.templates[0];
            }
        }
    };

    /**
     * Dynamic template mixin that try to fetch the component template, and if the template
     * is not in the DOM, it lads the template and re-initialize the component.
     */
    var DynamicTemplateMixin = {
        created: function(){
            //trying to get the template element
            var templateElement = $(this.$options.template).get(0);

            //if we have it then everything is cool
            if( templateElement ) return;

            _private.debug('template '+this.$options.template+' was not found. trying to load from server','DynamicTemplateMixin');

            //saving the templateId (making sure the # is removed)
            var templateId = this.$options.template.replace(/#/,"");

            //since we want to reconstruct the component we need the original HTML
            var componentHtml = this.$options.el.outerHTML;

            //in the meanwhile we set some temp template until we load the template
            this.$options.template = '<div style="display:none;"></div>';

            //loading the actual template from the server
            ApolloV.templates.load(templateId).then( function(html){

                //something is wrong, we didn't get the template
                if( !html || !html.length ){
                    _private.warn('no template was found');
                    return;
                }

                _private.debug('template loaded successfully','DynamicTemplateMixin');

                //adding the template into the DOM
                var $template = $('<script id="'+templateId+'" type="text/template">'+html+'</script>');
                $("body").append($template);

                //saving reference to the component element before it is destroyed.
                var tempElm = this.$el;

                //this is the original element of the component before Vue has compiled and replaced it
                var originalElm = $(componentHtml).get(0);

                //now we do some hard core hacking: since Vue is removing all the properties from the element (all the props:[])
                //we need to bring them back to the original component tag.
                for( var p in this._props ){
                    $(originalElm).attr(this._props[p].name,this._props[p].raw);
                }

                //destroy the current component but do not remove the element from the DOM
                this.$destroy();

                //bring back the original component tag
                $(tempElm).replaceWith(originalElm);

                //instantiating the component again
                ApolloV.components.render();

            }.bind(this));
        }
    };


    /**
     * data provider mixin allows for a component to set its data loading object. when this mixin is
     * added to a component, the component data could set a defaultDataProvider name, or the component tag
     * can override it with data-provider attribute.
     * the data provider object needs to be registered using ApolloV.data.registerProvider method.
     * The component needs to implement the afterDataLoaded method and can implement the getDateProviderConfig
     * method to provide to the data loader function some config.
     *
     * afterDataLoaded gets as first parameter the data that was loaded. it is the responsibility of this method to set the data
     * to the correct binded data to make sure it updates the View. the second parameter is a boolean which indicates if the
     * data was loaded in async or sync way (true=sync way)
     *
     */
    var DataProviderMixin = {
        props: ['data-provider'],

        data: function() {
            return {
                dataLoaded: false,
                loading: false
            }
        },

        beforeCompile: function(){
            //if autoLoad is not set then we don't load the data automatically, it will need to be called explicitly.
            if( !this.autoLoad ){
                return;
            }

            if( typeof this.afterDataLoaded !== 'function' ){
                _private.warn("autoLoad is true but component didn't implement afterDataLoaded. set autoLoad=false to manual load data or implement afterDataLoaded");
                return;
            }

            this.loadData().then( function(data){
                this.afterDataLoaded(data);
            }.bind(this));
        },

        methods: {
            loadData: function(config){
                this.loading = true;
                return new Promise( function(resolve){
                    var loader = _private.getDataProviderObject( this.dataProvider || this.defaultDataProvider );

                    if( !loader ){
                        _private.warn("data provider was not set for this component: "+ _private.getComponentTagName(this));
                        return;
                    }


                    if( typeof this.getDateProviderConfig === 'function' && !config ){
                        config = this.getDateProviderConfig();
                    }

                    config = config || {};


                    config['component-name'] = _private.getComponentTagName(this);

                    if( loader.data ){
                        if( typeof loader.data === 'function' ){
                            this.loading = false;
                            resolve(loader.data(config),true); //true means that the data was loaded synchroniously
                            this.dataLoaded = true;
                        }
                        else{
                            this.loading = false;
                            resolve(loader.data,true); //true means that the data was loaded synchroniously
                            this.dataLoaded = true;
                        }
                        return;
                    }

                    if( typeof loader === 'function' ){
                        loader(config).then( function(data){
                            this.loading = false;
                            resolve(data);
                            this.dataLoaded = true;
                        }.bind(this));
                    }
                    else if( loader.load ){
                        loader.load(config).then( function(data){
                            this.loading = false;
                            resolve(data);
                            this.dataLoaded = true;
                        }.bind(this));
                    }
                    else{
                        _private.warn("unkown data provider object.");
                    }
                }.bind(this));
            }
        }
    };

    /**
     * events mixin.
     * when using this mixin the component should define in it's data an arrya of events: ['comp-name:e-fire-name','comp-name:c-method-name']
     * the mixin will read the events array and will register for DOM events and create fire events according to the following:
     * an item in the array could be either a string or an object.
     *
     * in case this is a string, the mixin expect the following naming convention:
     * comp-name:event-state-change => in this case the mixin will generate the method fireStateChange()
     * comp-name:command-method-name => in this case the mixin will register for the event comp-name:command-method-name and will call methodName when this event is catched.
     *
     * in case this is an object the following properties should be defined in the object:
     * name => the event name
     * selector => (optional) in case we need to prvide some css selector for binding to child element events
     * handlerFn => string name of the function which will be called if this event name has been fired on the component. if this is provided, the mixin will register for this event
     * fireFn => string name for a method which should be generated for this event, so the component can fire this event.
     *
     * the mixin also adds a method called fire(name,data) to fire DOM events for the component.
     */
    var EventsMixin = {
        ready: function(){
            if( !this.events || !this.events.length ){
                _private.debug('no events were defined for the event mixin','EventsMixin');
                return;
            }
            //building events
            for( var i=0; i<this.events.length; i++ ){
                var item = this.events[i];

                var eventObj = {};
                var fnName;
                var eventType = null;

                //event was passed as plain string
                if( typeof item === 'string' ){
                    if( /:event-/.test(item) ){
                        //this is an event which the component triggers
                        eventType = _private.CONST.EVENT_TYPE_TRIGGER;
                        eventObj.name = item;
                        fnName = item.match(/:event-(.*)/);
                        if( fnName && fnName[1] ){
                            fnName = _private.kebabToCamel(fnName[1]);
                            eventObj.fireFn = "fire" + _private.capitalize(fnName);
                        }
                    }
                    else if(/:command-/.test(item)){
                        //this is an event which the component listen
                        eventType = _private.CONST.EVENT_TYPE_LISTENER;
                        eventObj.name = item;
                        fnName = item.match(/:command-(.*)/);
                        if( fnName && fnName[1] ){
                            fnName = _private.kebabToCamel(fnName[1]);
                            eventObj.handlerFn = fnName;
                        }
                    }

                    if( !eventType ){
                        _private.warn('event name='+item+' is not recognized by the ApolloVue events standards. event name must starts with *:event-* or *:command-*');
                        continue;
                    }
                }
                else{
                    eventObj = item;
                }

                if( !eventObj.name || !eventObj.name.length ){
                    _private.warn('event must provide a name. please check in the events index number '+i);
                    continue;
                }

                if( !eventObj.handlerFn && !eventObj.fireFn ){
                    _private.warn('you must provide either handlerFn or fireFn. please check in the events index number '+i);
                    continue;
                }

                if( eventObj.handlerFn ){
                    if( typeof this[eventObj.handlerFn] !== 'function' ){
                        _private.warn('method '+ eventObj.handlerFn + ' was not implemented by component but defined in events');
                        continue;
                    }
                    if( eventObj.selector ){
                        $(this.$el).on(eventObj.name,eventObj.selector,this[eventObj.handlerFn].bind(this));
                    }
                    else{
                        $(this.$el).on(eventObj.name,this[eventObj.handlerFn].bind(this));
                    }
                }

                if( eventObj.fireFn ){
                    if(  this[eventObj.fireFn]  ){
                        _private.warn('method '+ eventObj.fireFn + ' was already implemented by component, so auto generated method is ignored');
                        continue;
                    }
                    (function(){
                        var _name = eventObj.name;
                        this[eventObj.fireFn] = function(data,$elm){
                            this.fire(_name,data,$elm);
                        }
                    }.bind(this))();

                }
            }
        },

        methods: {
            fire: function(name,data,$elm){
                var strData = "null";
                if( data ){
                    try{
                        strData = window.JSON.stringify(data);
                    }
                    catch(e){

                    }
                }
                _private.debug('firing event '+ name + ' with data='+strData,'EventsMixin');
                $elm = $elm || $(this.$el);
                $elm.trigger(name,data);
            }
        }
    };

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
         * @attr globalMixins {function) when a new component is created using ApolloV.components.create the method
     * will inject each component with some global mixins which will be returned by this method. Use this method
     * to control some default mixins for all project or set of components. the method will get as a parameter the
     * component name.
     *
         * @attr debug {bool} if this is true additional debug logs will be sent to the console.log
         */
        config : null,

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
                // var templateUrl = _private.getTemplateUrl(templateId);

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
            events: EventsMixin
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
