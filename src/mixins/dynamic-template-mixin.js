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