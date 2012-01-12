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
mindplot.nlayout.EventBusDispatcher = new Class({

    initialize:function(designerModel) {
        $assert(designerModel, "designerModel cannot be null");
        this.registerBusEvents();

        var size = {width:25,height:25};
        this._layoutManager = new mindplot.nlayout.LayoutManager(0, size);

        this._layoutManager.addEvent('change', function(event) {
            var id = event.getId();
            var topic = designerModel.findTopicById(id);
            console.log("Modify position to:" + id);

            topic.setPosition(event.getPosition());
            topic.setOrder(event.getOrder());
        });
    },

    registerBusEvents:function () {
        mindplot.EventBus.instance.addEvent(mindplot.EventBus.events.NodeAdded, this._nodeAdded.bind(this));
        mindplot.EventBus.instance.addEvent(mindplot.EventBus.events.NodeRemoved, this._nodeRemoved.bind(this));
        mindplot.EventBus.instance.addEvent(mindplot.EventBus.events.NodeResizeEvent, this._nodeResizeEvent.bind(this));
        mindplot.EventBus.instance.addEvent(mindplot.EventBus.events.NodeMoveEvent, this._nodeMoveEvent.bind(this));
        mindplot.EventBus.instance.addEvent(mindplot.EventBus.events.NodeDisconnectEvent, this._nodeDisconnectEvent.bind(this));
        mindplot.EventBus.instance.addEvent(mindplot.EventBus.events.NodeConnectEvent, this._nodeConnectEvent.bind(this));
        mindplot.EventBus.instance.addEvent(mindplot.EventBus.events.NodeRepositionateEvent, this._nodeRepositionateEvent.bind(this));
        mindplot.EventBus.instance.addEvent(mindplot.EventBus.events.NodeShrinkEvent, this._nodeShrinkEvent.bind(this));
        mindplot.EventBus.instance.addEvent(mindplot.EventBus.events.DoLayout, this._doLayout.bind(this));
    },

    _nodeResizeEvent: function(args) {
        this._layoutManager.updateNodeSize(args.node.getId(), args.size);
    },

    _nodeMoveEvent: function(node) {
        console.log("mindplot.nlayout.EventBusDispatcher._nodeMoveEvent: Not Implemented yet");

    },

    _nodeDisconnectEvent: function(node) {
        this._layoutManager.disconnectNode(node.getId());
    },

    _nodeConnectEvent: function(args) {
        this._layoutManager.connectNode(args.parentNode.getId(), args.childNode.getId(), args.childNode.getOrder());

    },

    _nodeRepositionateEvent: function(node) {
        console.log("mindplot.nlayout.EventBusDispatcher._nodeRepositionateEvent: Not Implemented yet");

    },

    _nodeShrinkEvent: function(node) {
        this._layoutManager.updateShrinkState(node.getId(), node.areChildrenShrunken());
    },

    _nodeAdded: function(node) {
        // Centra topic must not be added twice ...
        if (node.getId() != 0) {
            this._layoutManager.addNode(node.getId(), {width:10,height:10}, node.getPosition());
        }
    },

    _nodeRemoved: function(node) {
        this._layoutManager.removeNode(node.getId());
    },

    _doLayout: function() {
        (function() {
            this._layoutManager.layout(true);
            console.log("---------");
            this._layoutManager.dump();
            console.log("---------");
        }).delay(0, this);
    }

});