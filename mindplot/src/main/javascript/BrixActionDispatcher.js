/*
 *    Copyright [2011] [wisemapping]
 *
 *   Licensed under WiseMapping Public License, Version 1.0 (the "License").
 *   It is basically the Apache License, Version 2.0 (the "License") plus the
 *   "powered by wisemapping" text requirement on every single page;
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the license at
 *
 *       http://www.wisemapping.org/license
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

mindplot.BrixActionDispatcher = new Class({
    Extends: mindplot.ActionDispatcher,
    initialize: function(commandContext, fireOnChange) {
        this.parent(commandContext, fireOnChange);
        this._commandContext = commandContext;
        this._actionDispatcher = new mindplot.LocalActionDispatcher(commandContext);
    },

    changeTextOnTopic : function(topicsIds, text) {
        var framework=$wise_collaborationManager.getCollaborativeFramework();
        if (!(topicsIds instanceof Array)) {
            topicsIds = [topicsIds];
        }
        var topic = framework.getTopic(topicsIds[0]);
        var callback = function(event, topic){
            topic.getBrixModel().removeListener("valueChanged", callback);
            this._actionDispatcher.changeTextOnTopic(topic.getId(),event.getNewValue());
        }.bindWithEvent(this,topic);
        topic.setText(text, true, callback);
    }
});

