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