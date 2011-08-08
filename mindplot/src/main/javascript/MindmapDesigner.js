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

mindplot.MindmapDesigner = new Class({
        initialize: function(profile, divElement) {
            $assert(profile, "profile must be defined");
            $assert(profile.zoom, "zoom must be defined");
            $assert(divElement, "divElement must be defined");

            // Dispatcher manager ...
            var commandContext = new mindplot.CommandContext(this);
            this._actionDispatcher = new mindplot.BrixActionDispatcher(commandContext);
            this._actionDispatcher.addEvent("modelUpdate", function(event) {
                this._fireEvent("modelUpdate", event);
            }.bind(this));

            mindplot.ActionDispatcher.setInstance(this._actionDispatcher);

            // Initial Zoom
            this._zoom = profile.zoom;
            this._viewMode = profile.viewMode;

            // Init Screen manager..
            var screenManager = new mindplot.ScreenManager(profile.width, profile.height, divElement);

            this._workspace = new mindplot.Workspace(profile, screenManager, this._zoom);

            //create editor
            var editorClass = mindplot.TextEditorFactory.getTextEditorFromName(mindplot.EditorOptions.textEditor);
            this._editor = new editorClass(this, this._actionRunner);

            // Init layout managers ...
            this._topics = [];
            this._layoutManager = new mindplot.layout.OriginalLayoutManager(this);

            // Register handlers..
            this._registerEvents();
            this._relationships = {};
            this._events = {};
        },

        _getTopics : function() {
            return this._topics;
        },

        getCentralTopic : function() {
            var topics = this._getTopics();
            return topics[0];
        },

        addEventListener : function(eventType, listener) {
            this._events[eventType] = listener;
        },

        _fireEvent : function(eventType, event) {
            var listener = this._events[eventType];
            if (listener != null) {
                listener(event);
            }
        },

        _registerEvents : function() {
            var mindmapDesigner = this;
            var workspace = this._workspace;
            var screenManager = workspace.getScreenManager();

            if (!$defined(this._viewMode) || ($defined(this._viewMode) && !this._viewMode)) {
                // Initialize workspace event listeners.
                // Create nodes on double click...
                screenManager.addEventListener('click', function(event) {
                    if (workspace.isWorkspaceEventsEnabled()) {
                        mindmapDesigner.getEditor().isVisible();
                        mindmapDesigner.getEditor().lostFocus();
                        // @todo: Puaj hack...
                        mindmapDesigner._cleanScreen();
                    }
                });

                screenManager.addEventListener('dblclick', function(event) {
                    if (workspace.isWorkspaceEventsEnabled()) {
                        mindmapDesigner.getEditor().lostFocus();
                        // Get mouse position
                        var pos = screenManager.getWorkspaceMousePosition(event);

                        // Create a new topic model ...
                        var mindmap = mindmapDesigner.getMindmap();
                        var model = mindmap.createNode(mindplot.model.NodeModel.MAIN_TOPIC_TYPE);
                        model.setPosition(pos.x, pos.y);

                        // Get central topic ...
                        var centralTopic = mindmapDesigner.getCentralTopic();
                        var centralTopicId = centralTopic.getId();

                        // Execute action ...
                        this._actionDispatcher.addTopic(model, centralTopicId, true);
                    }
                }.bind(this));
            }
        },

        _buildNodeGraph : function(model) {
            var workspace = this._workspace;

            // Create node graph ...
            var topic = mindplot.NodeGraph.create(model);

            this._layoutManager.addHelpers(topic);

            // Append it to the workspace ...
            var topics = this._topics;
            topics.push(topic);

            // Add Topic events ...
            this._layoutManager.registerListenersOnNode(topic);

            // Connect Topic ...
            var isConnected = model.isConnected();
            if (isConnected) {
                // Improve this ...
                var targetTopicModel = model.getParent();
                var targetTopicId = targetTopicModel.getId();
                var targetTopic = null;

                for (var i = 0; i < topics.length; i++) {
                    var t = topics[i];
                    if (t.getModel() == targetTopicModel) {
                        targetTopic = t;
                        // Disconnect the node. It will be connected again later ...
                        model.disconnect();
                        break;
                    }
                }
                $assert(targetTopic, "Could not find a topic to connect");
                topic.connectTo(targetTopic, workspace);
            }

            return  topic;
        },

        onObjectFocusEvent : function(currentObject, event) {
            this.getEditor().lostFocus();
            var selectableObjects = this.getSelectedObjects();

            // Disable all nodes on focus but not the current if Ctrl key isn't being pressed
            if (!$defined(event) || event.ctrlKey == false) {
                selectableObjects.forEach(function(selectableObject) {
                    if (selectableObject.isOnFocus() && selectableObject != currentObject) {
                        selectableObject.setOnFocus(false);
                    }
                });
            }
        },

        zoomOut : function() {
            var scale = this._zoom * 1.2;
            if (scale <= 4) {
                this._zoom = scale;
                this._workspace.setZoom(this._zoom);
            }
            else {
                core.Monitor.getInstance().logMessage('Sorry, no more zoom can be applied. \n Why do you need more?');
            }

        },

        zoomIn : function() {
            var scale = this._zoom / 1.2;
            if (scale >= 0.3) {
                this._zoom = scale;
                this._workspace.setZoom(this._zoom);
            }
            else {
                core.Monitor.getInstance().logMessage('Sorry, no more zoom can be applied. \n Why do you need more?');
            }
        },

        createChildForSelectedNode : function() {

            var nodes = this._getSelectedNodes();
            if (nodes.length <= 0) {
                // If there are more than one node selected,
                core.Monitor.getInstance().logMessage('Could not create a topic. Only one node must be selected.');
                return;

            }
            if (nodes.length > 1) {

                // If there are more than one node selected,
                core.Monitor.getInstance().logMessage('Could not create a topic. One topic must be selected.');
                return;
            }

            // Add new node ...
            var centalTopic = nodes[0];
            var parentTopicId = centalTopic.getId();
            var childModel = centalTopic.createChildModel(this._layoutManager.needsPrepositioning());

            // Execute event ...
            this._actionDispatcher.addTopic(childModel, parentTopicId, true);

        },

        createSiblingForSelectedNode : function() {
            var nodes = this._getSelectedNodes();
            if (nodes.length <= 0) {
                // If there are more than one node selected,
                core.Monitor.getInstance().logMessage('Could not create a topic. Only one node must be selected.');
                return;

            }
            if (nodes.length > 1) {
                // If there are more than one node selected,
                core.Monitor.getInstance().logMessage('Could not create a topic. One topic must be selected.');
                return;
            }

            var topic = nodes[0];
            if (topic.getType() == mindplot.model.NodeModel.CENTRAL_TOPIC_TYPE) {
                // Central topic doesn't have siblings ...
                this.createChildForSelectedNode();

            } else {
                var parentTopic = topic.getOutgoingConnectedTopic();
                var siblingModel = topic.createSiblingModel(this._layoutManager.needsPrepositioning());
                var parentTopicId = parentTopic.getId();

                this._actionDispatcher.addTopic(siblingModel, parentTopicId, true);
            }
        },

        addRelationShip2SelectedNode : function(event) {
            var screen = this._workspace.getScreenManager();
            var pos = screen.getWorkspaceMousePosition(event);
            var selectedTopics = this.getSelectedNodes();
            if (selectedTopics.length > 0 &&
                (!$defined(this._creatingRelationship) || ($defined(this._creatingRelationship) && !this._creatingRelationship))) {
                this._workspace.enableWorkspaceEvents(false);
                var fromNodePosition = selectedTopics[0].getPosition();
                this._relationship = new web2d.CurvedLine();
                this._relationship.setStyle(web2d.CurvedLine.SIMPLE_LINE);
                this._relationship.setDashed(2, 2);
                this._relationship.setFrom(fromNodePosition.x, fromNodePosition.y);
                this._relationship.setTo(pos.x, pos.y);
                this._workspace.appendChild(this._relationship);
                this._creatingRelationship = true;
                this._relationshipMouseMoveFunction = this._relationshipMouseMove.bindWithEvent(this);
                this._relationshipMouseClickFunction = this._relationshipMouseClick.bindWithEvent(this, selectedTopics[0]);
                this._workspace.getScreenManager().addEventListener('mousemove', this._relationshipMouseMoveFunction);
                this._workspace.getScreenManager().addEventListener('click', this._relationshipMouseClickFunction);
            }
        },

        _relationshipMouseMove : function(event) {
            var screen = this._workspace.getScreenManager();
            var pos = screen.getWorkspaceMousePosition(event);
            this._relationship.setTo(pos.x - 1, pos.y - 1); //to prevent click event target to be the line itself
            event.preventDefault();
            event.stop();
            return false;
        },

        _relationshipMouseClick : function (event, fromNode) {
            var target = event.target;
            while (target.tagName != "g" && $defined(target.parentNode)) {
                target = target.parentNode;
            }
            if ($defined(target.virtualRef)) {
                var targetNode = target.virtualRef;
                this.addRelationship(fromNode, targetNode);
            }
            this._workspace.removeChild(this._relationship);
            this._relationship = null;
            this._workspace.getScreenManager().removeEventListener('mousemove', this._relationshipMouseMoveFunction);
            this._workspace.getScreenManager().removeEventListener('click', this._relationshipMouseClickFunction);
            this._creatingRelationship = false;
            this._workspace.enableWorkspaceEvents(true);
            event.preventDefault();
            event.stop();
            return false;
        },

        addRelationship : function(fromNode, toNode) {
            // Create a new topic model ...
            var mindmap = this.getMindmap();
            var model = mindmap.createRelationship(fromNode.getModel().getId(), toNode.getModel().getId());

            this._actionDispatcher.addRelationship(model, mindmap);

        },

        needsSave : function() {
            return this._actionRunner.hasBeenChanged();
        },

        autoSaveEnabled : function(value) {
            if ($defined(value) && value) {
                var autosave = function() {

                    if (this.needsSave()) {
                        this.save(null, false);
                    }
                };
                autosave.bind(this).periodical(30000);
            }
        },

        save : function(onSavedHandler, saveHistory) {
            var persistantManager = mindplot.PersistanceManager;
            var mindmap = this._mindmap;

            var properties = {zoom:this._zoom, layoutManager:this._layoutManager.getClassName()};
            persistantManager.save(mindmap, properties, onSavedHandler, saveHistory);
            this._fireEvent("save", {type:saveHistory});

            // Refresh undo state...
            this._actionRunner.markAsChangeBase();
        },

        loadFromCollaborativeModel: function(collaborationManager){
            var mindmap = collaborationManager.buildWiseModel();
            this._loadMap(1, mindmap);

            // Place the focus on the Central Topic
            var centralTopic = this.getCentralTopic();
            this._goToNode.attempt(centralTopic, this);

            this._fireEvent("loadsuccess");
        },

        loadFromXML : function(mapId, xmlContent) {
            $assert(xmlContent, 'mindmapId can not be null');
            $assert(xmlContent, 'xmlContent can not be null');

            // Explorer Hack with local files ...
            var domDocument = core.Utils.createDocumentFromText(xmlContent);

            var serializer = mindplot.XMLMindmapSerializerFactory.getSerializerFromDocument(domDocument);
            var mindmap = serializer.loadFromDom(domDocument);

            this._loadMap(mapId, mindmap);

            // Place the focus on the Central Topic
            var centralTopic = this.getCentralTopic();
            this._goToNode.attempt(centralTopic, this);

            this._fireEvent("loadsuccess");

        }
        ,

        load : function(mapId) {
            $assert(mapId, 'mapName can not be null');

            // Build load function ...
            var persistantManager = mindplot.PersistanceManager;

            // Loading mindmap ...
            var mindmap = persistantManager.load(mapId);

            // Finally, load the map in the editor ...
            this._loadMap(mapId, mindmap);

            // Place the focus on the Central Topic
            var centralTopic = this.getCentralTopic();
            this._goToNode.attempt(centralTopic, this);

            this._fireEvent("loadsuccess");
        }
        ,

        _loadMap : function(mapId, mindmapModel) {
            var designer = this;
            if (mindmapModel != null) {
                mindmapModel.setId(mapId);
                designer._mindmap = mindmapModel;

                // Building node graph ...
                var branches = mindmapModel.getBranches();
                for (var i = 0; i < branches.length; i++) {
                    // NodeModel -> NodeGraph ...
                    var nodeModel = branches[i];
                    var nodeGraph = this._nodeModelToNodeGraph(nodeModel, false);

                    // Update shrink render state...
                    nodeGraph.setBranchVisibility(true);
                }
                var relationships = mindmapModel.getRelationships();
                for (var j = 0; j < relationships.length; j++) {
                    var relationship = this._relationshipModelToRelationship(relationships[j]);
                }
            }
            core.Executor.instance.setLoading(false);
            this._getTopics().forEach(function(topic) {
                delete topic.getModel()._finalPosition;
            });
            this._fireEvent("loadsuccess");

        }
        ,


        getMindmap : function() {
            return this._mindmap;
        }
        ,

        undo : function() {
            this._actionRunner.undo();
        }
        ,

        redo : function() {
            this._actionRunner.redo();
        }
        ,

        _nodeModelToNodeGraph : function(nodeModel, isVisible) {
            $assert(nodeModel, "Node model can not be null");
            var nodeGraph = this._buildNodeGraph(nodeModel);

            if (isVisible)
                nodeGraph.setVisibility(isVisible);

            var children = nodeModel.getChildren().slice();
            children = this._layoutManager.prepareNode(nodeGraph, children);

            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                if ($defined(child))
                    this._nodeModelToNodeGraph(child, false);
            }

            var workspace = this._workspace;
            workspace.appendChild(nodeGraph);
            return nodeGraph;
        }
        ,

        _relationshipModelToRelationship : function(model) {
            $assert(model, "Node model can not be null");
            var relationship = this._buildRelationship(model);
            var sourceTopic = relationship.getSourceTopic();
            sourceTopic.addRelationship(relationship);
            var targetTopic = relationship.getTargetTopic();
            targetTopic.addRelationship(relationship);
            relationship.setVisibility(sourceTopic.isVisible() && targetTopic.isVisible());
            var workspace = this._workspace;
            workspace.appendChild(relationship);
            relationship.redraw();
            return relationship;
        },

        createRelationship : function(model) {
            this._mindmap.addRelationship(model);
            return this._relationshipModelToRelationship(model);
        },

        removeRelationship : function(model) {
            this._mindmap.removeRelationship(model);
            var relationship = this._relationships[model.getId()];
            var sourceTopic = relationship.getSourceTopic();
            sourceTopic.removeRelationship(relationship);
            var targetTopic = relationship.getTargetTopic();
            targetTopic.removeRelationship(relationship);
            this._workspace.removeChild(relationship);
            delete this._relationships[model.getId()];
        },

        _buildRelationship : function (model) {
            var elem = this;

            var fromNodeId = model.getFromNode();
            var toNodeId = model.getToNode();

            var fromTopic = null;
            var toTopic = null;
            var topics = this._topics;

            for (var i = 0; i < topics.length; i++) {
                var t = topics[i];
                if (t.getModel().getId() == fromNodeId) {
                    fromTopic = t;
                }
                if (t.getModel().getId() == toNodeId) {
                    toTopic = t;
                }
                if (toTopic != null && fromTopic != null) {
                    break;
                }
            }

            // Create node graph ...
            var relationLine = new mindplot.RelationshipLine(fromTopic, toTopic, model.getLineType());
            if ($defined(model.getSrcCtrlPoint())) {
                var srcPoint = model.getSrcCtrlPoint().clone();
                relationLine.setSrcControlPoint(srcPoint);
            }
            if ($defined(model.getDestCtrlPoint())) {
                var destPoint = model.getDestCtrlPoint().clone();
                relationLine.setDestControlPoint(destPoint);
            }


            relationLine.getLine().setDashed(3, 2);
            relationLine.setShowEndArrow(model.getEndArrow());
            relationLine.setShowStartArrow(model.getStartArrow());
            relationLine.setModel(model);

            //Add Listeners
            relationLine.addEventListener('onfocus', function(event) {
                elem.onObjectFocusEvent.attempt([relationLine, event], elem);
            });

            // Append it to the workspace ...
            this._relationships[model.getId()] = relationLine;

            return  relationLine;
        },

        getEditor : function() {
            return this._editor;
        },

        _removeNode : function(node) {
            if (node.getTopicType() != mindplot.model.NodeModel.CENTRAL_TOPIC_TYPE) {
                var parent = node._parent;
                node.disconnect(this._workspace);

                //remove children
                while (node._getChildren().length > 0) {
                    this._removeNode(node._getChildren()[0]);
                }

                this._workspace.removeChild(node);
                this._topics.erase(node);

                // Delete this node from the model...
                var model = node.getModel();
                model.deleteNode();

                if ($defined(parent)) {
                    this._goToNode(parent);
                }
            }
        },

        deleteCurrentNode : function() {

            var validateFunc = function(selectedObject) {
                return selectedObject.getType() == mindplot.RelationshipLine.type || selectedObject.getTopicType() != mindplot.model.NodeModel.CENTRAL_TOPIC_TYPE
            };
            var validateError = 'Central topic can not be deleted.';
            var selectedObjects = this._getValidSelectedObjectsIds(validateFunc, validateError);
            if (selectedObjects.nodes.length > 0 || selectedObjects.relationshipLines.length > 0) {
                this._actionDispatcher.deleteTopics(selectedObjects);
            }

        },

        setFont2SelectedNode : function(font) {
            var validSelectedObjects = this._getValidSelectedObjectsIds();
            var topicsIds = validSelectedObjects.nodes;
            if (topicsIds.length > 0) {
                this._actionDispatcher.changeFontFamilyToTopic(topicsIds, font);

            }
        },

        setStyle2SelectedNode : function() {
            var validSelectedObjects = this._getValidSelectedObjectsIds();
            var topicsIds = validSelectedObjects.nodes;
            if (topicsIds.length > 0) {
                this._actionDispatcher.changeFontStyleToTopic(topicsIds);
            }
        },

        setFontColor2SelectedNode : function(color) {
            var validSelectedObjects = this._getValidSelectedObjectsIds();
            var topicsIds = validSelectedObjects.nodes;
            if (topicsIds.length > 0) {
                this._actionDispatcher.changeFontColorToTopic(topicsIds, color);
            }
        },

        setBackColor2SelectedNode : function(color) {

            var validateFunc = function(topic) {
                return topic.getShapeType() != mindplot.model.NodeModel.SHAPE_TYPE_LINE
            };
            var validateError = 'Color can not be set to line topics.';
            var validSelectedObjects = this._getValidSelectedObjectsIds(validateFunc, validateError);
            var topicsIds = validSelectedObjects.nodes;
            if (topicsIds.length > 0) {
                this._actionDispatcher.changeBackgroundColorToTopic(topicsIds, color);
            }
        },


        _getValidSelectedObjectsIds : function(validate, errorMsg) {
            var result = {"nodes":[],"relationshipLines":[]};
            var selectedNodes = this._getSelectedNodes();
            var selectedRelationshipLines = this.getSelectedRelationshipLines();
            if (selectedNodes.length == 0 && selectedRelationshipLines.length == 0) {
                core.Monitor.getInstance().logMessage('At least one element must be selected to execute this operation.');
            } else {
                var isValid = true;
                for (var i = 0; i < selectedNodes.length; i++) {
                    var selectedNode = selectedNodes[i];
                    if ($defined(validate)) {
                        isValid = validate(selectedNode);
                    }

                    // Add node only if it's valid.
                    if (isValid) {
                        result.nodes.push(selectedNode.getId());
                    } else {
                        core.Monitor.getInstance().logMessage(errorMsg);
                    }
                }
                for (var j = 0; j < selectedRelationshipLines.length; j++) {
                    var selectedLine = selectedRelationshipLines[j];
                    isValid = true;
                    if ($defined(validate)) {
                        isValid = validate(selectedLine);
                    }

                    if (isValid) {
                        result.relationshipLines.push(selectedLine.getId());
                    } else {
                        core.Monitor.getInstance().logMessage(errorMsg);
                    }
                }
            }
            return result;
        },

        setBorderColor2SelectedNode : function(color) {
            var validateFunc = function(topic) {
                return topic.getShapeType() != mindplot.model.NodeModel.SHAPE_TYPE_LINE
            };
            var validateError = 'Color can not be set to line topics.';
            var validSelectedObjects = this._getValidSelectedObjectsIds(validateFunc, validateError);
            var topicsIds = validSelectedObjects.nodes;

            if (topicsIds.length > 0) {
                this._actionDispatcher.changeBorderColorToTopic(topicsIds, color);
            }
        },

        setFontSize2SelectedNode : function(size) {
            var validSelectedObjects = this._getValidSelectedObjectsIds();
            var topicsIds = validSelectedObjects.nodes;
            if (topicsIds.length > 0) {
                this._actionDispatcher.changeFontSizeToTopic(topicsIds, size);
            }
        },

        setShape2SelectedNode : function(shape) {
            var validateFunc = function(topic) {
                return !(topic.getType() == mindplot.model.NodeModel.CENTRAL_TOPIC_TYPE && shape == mindplot.model.NodeModel.SHAPE_TYPE_LINE)
            };
            var validateError = 'Central Topic shape can not be changed to line figure.';
            var validSelectedObjects = this._getValidSelectedObjectsIds(validateFunc, validateError);
            var topicsIds = validSelectedObjects.nodes;

            if (topicsIds.length > 0) {
                this._actionDispatcher.changeShapeToTopic(topicsIds, shape);
            }
        },


        setWeight2SelectedNode : function() {
            var validSelectedObjects = this._getValidSelectedObjectsIds();
            var topicsIds = validSelectedObjects.nodes;
            if (topicsIds.length > 0) {
                this._actionDispatcher.changeFontWeightToTopic(topicsIds);
            }
        },

        addIconType2SelectedNode : function(iconType) {
            var validSelectedObjects = this._getValidSelectedObjectsIds();
            var topicsIds = validSelectedObjects.nodes;
            if (topicsIds.length > 0) {
                this._actionDispatcher.addIconToTopic(topicsIds[0], iconType);
            }
        },

        addLink2Node : function(url) {
            var validSelectedObjects = this._getValidSelectedObjectsIds();
            var topicsIds = validSelectedObjects.nodes;
            if (topicsIds.length > 0) {
                this._actionDispatcher.addLinkToTopic(topicsIds[0], url);
            }
        },

        addLink2SelectedNode : function() {
            var selectedTopics = this.getSelectedNodes();
            var topic = null;
            if (selectedTopics.length > 0) {
                topic = selectedTopics[0];
                if (!$defined(topic._hasLink)) {
                    var msg = new Element('div');
                    var urlText = new Element('div').inject(msg);
                    urlText.innerHTML = "URL:";
                    var formElem = new Element('form', {'action': 'none', 'id':'linkFormId'});
                    var urlInput = new Element('input', {'type': 'text', 'size':30});
                    urlInput.inject(formElem);
                    formElem.inject(msg);

                    var okButtonId = "linkOkButtonId";
                    formElem.addEvent('submit', function(e) {
                        $(okButtonId).fireEvent('click', e);
                        e = new Event(e);
                        e.stop();
                    });


                    var okFunction = function() {
                        var url = urlInput.value;
                        var result = false;
                        if ("" != url.trim()) {
                            this.addLink2Node(url);
                            result = true;
                        }
                        return result;
                    }.bind(this);
                    var dialog = mindplot.LinkIcon.buildDialog(this, okFunction, okButtonId);
                    dialog.adopt(msg).show();

                    // IE doesn't like too much this focus action...
                    if (!core.UserAgent.isIE()) {
                        urlInput.focus();
                    }
                }
            } else {
                core.Monitor.getInstance().logMessage('At least one topic must be selected to execute this operation.');
            }
        },

        addNote2Node : function(text) {
            var validSelectedObjects = this._getValidSelectedObjectsIds();
            var topicsIds = validSelectedObjects.nodes;
            if (topicsIds.length > 0) {
                this._actionDispatcher.addNoteToTopic(topicsIds[0], text);
            }
        },

        addNote2SelectedNode : function() {
            var selectedTopics = this.getSelectedNodes();
            var topic = null;
            if (selectedTopics.length > 0) {
                topic = selectedTopics[0];
                if (!$defined(topic._hasNote)) {
                    var msg = new Element('div');
                    var text = new Element('div').inject(msg);
                    var formElem = new Element('form', {'action': 'none', 'id':'noteFormId'});
                    var textInput = new Element('textarea').setStyles({'width':280, 'height':50});
                    textInput.inject(formElem);
                    formElem.inject(msg);

                    var okButtonId = "noteOkButtonId";
                    formElem.addEvent('submit', function(e) {
                        $(okButtonId).fireEvent('click', e);
                        e = new Event(e);
                        e.stop();
                    });


                    var okFunction = function() {
                        var text = textInput.value;
                        var result = false;
                        if ("" != text.trim()) {
                            this.addNote2Node(text);
                            result = true;
                        }
                        return result;
                    }.bind(this);
                    var dialog = mindplot.Note.buildDialog(this, okFunction, okButtonId);
                    dialog.adopt(msg).show();

                    // IE doesn't like too much this focus action...
                    if (!core.UserAgent.isIE()) {
                        textInput.focus();
                    }
                }
            } else {
                core.Monitor.getInstance().logMessage('At least one topic must be selected to execute this operation.');
            }
        },

        _getSelectedNodes : function() {
            var result = new Array();
            for (var i = 0; i < this._topics.length; i++) {
                if (this._topics[i].isOnFocus()) {
                    result.push(this._topics[i]);
                }
            }
            return result;
        },

        getSelectedRelationshipLines : function() {
            var result = new Array();
            for (var id in this._relationships) {
                var relationship = this._relationships[id];
                if (relationship.isOnFocus()) {
                    result.push(relationship);
                }
            }
            return result;
        },

        getSelectedNodes : function() {
            return this._getSelectedNodes();
        },

        getSelectedObjects : function() {
            var selectedNodes = this.getSelectedNodes();
            var selectedRelationships = this.getSelectedRelationshipLines();
            selectedRelationships.extend(selectedNodes);
            return selectedRelationships;
        },

        keyEventHandler : function(event) {
            if (this._workspace.isWorkspaceEventsEnabled()) {
                var evt = (event) ? event : window.event;

                if (evt.keyCode == 8) {
                    if ($defined(event)) {
                        if ($defined(event.preventDefault)) {
                            event.preventDefault();
                        } else {
                            event.returnValue = false;
                        }
                        new Event(event).stop();
                    }
                    else
                        evt.returnValue = false;
                }
                else {
                    // @ToDo: I think that some of the keys has been removed ... Check this...
                    evt = new Event(event);
                    var key = evt.key;
                    if (!this._editor.isVisible()) {
                        if (((evt.code >= 65 && evt.code <= 90) || (evt.code >= 48 && evt.code <= 57)) && !(evt.control || evt.meta)) {
                            if ($defined(evt.shift)) {
                                key = key.toUpperCase();
                            }
                            this._showEditor(key);
                        }
                        else {
                            var nodes;
                            var node;
                            switch (key) {
                                case 'delete':
                                    this.deleteCurrentNode();
                                    break;
                                case 'enter':
                                    if (!evt.meta) {
                                        this.createSiblingForSelectedNode();
                                        break;
                                    }
                                case 'insert':
                                    this.createChildForSelectedNode();
                                    break;
                                case 'right':
                                    nodes = this._getSelectedNodes();
                                    if (nodes.length > 0) {
                                        node = nodes[0];
                                        if (node.getTopicType() == mindplot.model.NodeModel.CENTRAL_TOPIC_TYPE) {
                                            this._goToSideChild(node, 'RIGHT');
                                        }
                                        else {
                                            if (node.getPosition().x < 0) {
                                                this._goToParent(node);
                                            }
                                            else if (!node.areChildrenShrinked()) {
                                                this._goToChild(node);
                                            }
                                        }
                                    }
                                    break;
                                case 'left':
                                    nodes = this._getSelectedNodes();
                                    if (nodes.length > 0) {
                                        node = nodes[0];
                                        if (node.getTopicType() == mindplot.model.NodeModel.CENTRAL_TOPIC_TYPE) {
                                            this._goToSideChild(node, 'LEFT');
                                        }
                                        else {
                                            if (node.getPosition().x > 0) {
                                                this._goToParent(node);
                                            }
                                            else if (!node.areChildrenShrinked()) {
                                                this._goToChild(node);
                                            }
                                        }
                                    }
                                    break;
                                case'up':
                                    nodes = this._getSelectedNodes();
                                    if (nodes.length > 0) {
                                        node = nodes[0];
                                        if (node.getTopicType() != mindplot.model.NodeModel.CENTRAL_TOPIC_TYPE) {
                                            this._goToBrother(node, 'UP');
                                        }
                                    }
                                    break;
                                case 'down':
                                    nodes = this._getSelectedNodes();
                                    if (nodes.length > 0) {
                                        node = nodes[0];
                                        if (node.getTopicType() != mindplot.model.NodeModel.CENTRAL_TOPIC_TYPE) {
                                            this._goToBrother(node, 'DOWN');
                                        }
                                    }
                                    break;
                                case 'f2':
                                    this._showEditor();
                                    break;
                                case 'space':
                                    nodes = this._getSelectedNodes();
                                    if (nodes.length > 0) {
                                        var topic = nodes[0];

                                        var model = topic.getModel();
                                        var isShrink = !model.areChildrenShrinked();
                                        topic.setChildrenShrinked(isShrink);
                                    }
                                    break;
                                case 'backspace':
                                    evt.preventDefault();
                                    break;
                                case 'esc':
                                    nodes = this._getSelectedNodes();
                                    for (var i = 0; i < nodes.length; i++) {
                                        node = nodes[i];
                                        node.setOnFocus(false);
                                    }
                                    break;
                                case 'z':
                                    if (evt.control || evt.meta) {
                                        if (evt.shift) {
                                            this.redo();
                                        }
                                        else {
                                            this.undo();
                                        }
                                    }
                                    break;
                                default:
                                    break;
                            }
                        }
                        evt.stop();
                    }
                }
            }
        },

        _showEditor : function(key) {
            var nodes = this._getSelectedNodes();
            if (nodes.length == 1) {
                var node = nodes[0];
                if (key && key != "") {
                    this._editor.setInitialText(key);
                }
                this._editor.getFocusEvent.attempt(node, this._editor);
            }
        },

        _goToBrother : function(node, direction) {
            var brothers = node._parent._getChildren();
            var target = node;
            var y = node.getPosition().y;
            var x = node.getPosition().x;
            var dist = null;
            for (var i = 0; i < brothers.length; i++) {
                var sameSide = (x * brothers[i].getPosition().x) >= 0;
                if (brothers[i] != node && sameSide) {
                    var brother = brothers[i];
                    var brotherY = brother.getPosition().y;
                    if (direction == "DOWN" && brotherY > y) {
                        var distancia = y - brotherY;
                        if (distancia < 0) {
                            distancia = distancia * (-1);
                        }
                        if (dist == null || dist > distancia) {
                            dist = distancia;
                            target = brothers[i];
                        }
                    }
                    else if (direction == "UP" && brotherY < y) {
                        var distancia = y - brotherY;
                        if (distancia < 0) {
                            distancia = distancia * (-1);
                        }
                        if (dist == null || dist > distancia) {
                            dist = distancia;
                            target = brothers[i];
                        }
                    }
                }
            }
            this._goToNode(target);
        },

        _goToNode : function(node) {
            node.setOnFocus(true);
            this.onObjectFocusEvent.attempt(node, this);
        },

        _goToSideChild : function(node, side) {
            var children = node._getChildren();
            if (children.length > 0) {
                var target = children[0];
                var top = null;
                for (var i = 0; i < children.length; i++) {
                    var child = children[i];
                    var childY = child.getPosition().y;
                    if (side == 'LEFT' && child.getPosition().x < 0) {
                        if (top == null || childY < top) {
                            target = child;
                            top = childY;
                        }
                    }
                    if (side == 'RIGHT' && child.getPosition().x > 0) {
                        if (top == null || childY < top) {
                            target = child;
                            top = childY;
                        }
                    }
                }

                this._goToNode(target);
            }
        },

        _goToParent : function(node) {
            var parent = node._parent;
            this._goToNode(parent);
        },

        _goToChild : function(node) {
            var children = node._getChildren();
            if (children.length > 0) {
                var target = children[0];
                var top = target.getPosition().y;
                for (var i = 0; i < children.length; i++) {
                    var child = children[i];
                    if (child.getPosition().y < top) {
                        top = child.getPosition().y;
                        target = child;
                    }
                }
                this._goToNode(target);
            }
        },

        getWorkSpace : function() {
            return this._workspace;
        }
    }
);
