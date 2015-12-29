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
