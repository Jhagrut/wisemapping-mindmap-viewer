package com.wisemapping.rest;


import com.wisemapping.exceptions.WiseMappingException;
import com.wisemapping.model.MindMap;
import com.wisemapping.model.MindmapUser;
import com.wisemapping.model.User;
import com.wisemapping.rest.model.RestMindmap;
import com.wisemapping.rest.model.RestMindmapInfo;
import com.wisemapping.rest.model.RestMindmapList;
import com.wisemapping.security.Utils;
import com.wisemapping.service.MindmapService;
import com.wisemapping.validator.MapInfoValidator;
import org.jetbrains.annotations.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;


@Controller
public class MindmapController extends BaseController {
    @Autowired
    private MindmapService mindmapService;

    @RequestMapping(method = RequestMethod.GET, value = "/maps/{id}", produces = {"application/json", "text/html", "application/xml"})
    @ResponseBody
    public ModelAndView getMindmap(@PathVariable int id) throws IOException {
        final MindMap mindMap = mindmapService.getMindmapById(id);
        final RestMindmap map = new RestMindmap(mindMap);
        return new ModelAndView("mapView", "map", map);
    }

    @RequestMapping(method = RequestMethod.GET, value = "/maps", produces = {"application/json", "text/html", "application/xml"})
    public ModelAndView getMindmaps(@RequestParam(required = false) String q) throws IOException {
        final User user = com.wisemapping.security.Utils.getUser();

        final MindmapFilter filter = MindmapFilter.parse(q);

        final List<MindmapUser> mapsByUser = mindmapService.getMindmapUserByUser(user);
        final List<MindMap> mindmaps = new ArrayList<MindMap>();
        for (MindmapUser mindmapUser : mapsByUser) {
            final MindMap mindmap = mindmapUser.getMindMap();
            if (filter.accept(mindmap, user)) {
                mindmaps.add(mindmap);
            }
        }
        final RestMindmapList restMindmapList = new RestMindmapList(mindmaps);
        return new ModelAndView("mapsView", "list", restMindmapList);
    }

    @RequestMapping(method = RequestMethod.PUT, value = "/maps/{id}/document", consumes = {"application/xml", "application/json"}, produces = {"application/json", "text/html", "application/xml"})
    @ResponseStatus(value = HttpStatus.NO_CONTENT)
    public void updateDocument(@RequestBody RestMindmap restMindmap, @PathVariable int id, @RequestParam(required = false) boolean minor) throws IOException, WiseMappingException {

        final MindMap mindMap = mindmapService.getMindmapById(id);
        final User user = Utils.getUser();

        // Validate arguments ...
        final String properties = restMindmap.getProperties();
        if (properties == null) {
            throw new IllegalArgumentException("Map properties can not be null");
        }
        mindMap.setProperties(properties);

        // Validate content ...
        final String xml = restMindmap.getXml();
        if (xml == null) {
            throw new IllegalArgumentException("Map xml can not be null");
        }
        mindMap.setXmlStr(xml);

        // Update map ...
        updateMindmap(minor, mindMap, user);
    }


    /**
     * The intention of this method is the update of several properties at once ...
     */
    @RequestMapping(method = RequestMethod.PUT, value = "/maps/{id}", consumes = {"application/xml", "application/json"}, produces = {"application/json", "text/html", "application/xml"})
    @ResponseStatus(value = HttpStatus.NO_CONTENT)
    public void updateMap(@RequestBody RestMindmap restMindmap, @PathVariable int id, @RequestParam(required = false) boolean minor) throws IOException, WiseMappingException {

        final MindMap mindMap = mindmapService.getMindmapById(id);
        final User user = Utils.getUser();

        // Update document properties ...
        final String properties = restMindmap.getProperties();
        if (properties != null) {
            mindMap.setProperties(properties);
        }
        final String xml = restMindmap.getXml();
        if (xml != null) {
            mindMap.setXmlStr(xml);
        }

        // Update title  ...
        final String title = restMindmap.getTitle();
        if (title != null && !title.equals(mindMap.getTitle())) {
            if (mindmapService.getMindmapByTitle(title, user) != null) {
                throw buildValidationException("title", "You already have a map with this title");
            }
            mindMap.setTitle(title);
        }

        // Update description ...
        final String description = restMindmap.getDescription();
        if (description != null) {
            mindMap.setDescription(description);
        }

        final String tags = restMindmap.getTags();
        if (tags != null) {
            mindMap.setTags(tags);
        }

        // Update map ...
        updateMindmap(minor, mindMap, user);
    }

    private ValidationException buildValidationException(@NotNull String fieldName, @NotNull String message) throws ValidationException {
        final BindingResult result = new BeanPropertyBindingResult(new RestMindmap(), "");
        result.rejectValue(fieldName, "error.not-specified", null, message);
        return new ValidationException(result);
    }


    @RequestMapping(method = RequestMethod.PUT, value = "/maps/{id}/title", consumes = {"text/plain"}, produces = {"application/json", "text/html", "application/xml"})
    @ResponseStatus(value = HttpStatus.NO_CONTENT)
    public void changeMapTitle(@RequestBody String title, @PathVariable int id) throws WiseMappingException {

        final MindMap mindMap = mindmapService.getMindmapById(id);
        final User user = Utils.getUser();

        // Is there a map with the same name ?
        if (mindmapService.getMindmapByTitle(title, user) != null) {

            throw buildValidationException("title", "You already have a mindmap with this title");
        }

        // Update map ...
        final MindMap mindmap = mindmapService.getMindmapById(id);
        mindmap.setTitle(title);
        updateMindmap(true, mindMap, user);
    }

    @RequestMapping(method = RequestMethod.PUT, value = "/maps/{id}/description", consumes = {"text/plain"}, produces = {"application/json", "text/html", "application/xml"})
    @ResponseStatus(value = HttpStatus.NO_CONTENT)
    public void changeMapDescription(@RequestBody String description, @PathVariable int id) throws WiseMappingException {

        final MindMap mindMap = mindmapService.getMindmapById(id);
        final User user = Utils.getUser();

        // Update map ...
        final MindMap mindmap = mindmapService.getMindmapById(id);
        mindmap.setDescription(description);
        updateMindmap(true, mindMap, user);
    }

    @RequestMapping(method = RequestMethod.PUT, value = "/maps/{id}/publish", consumes = {"text/plain"}, produces = {"application/json", "text/html", "application/xml"})
    @ResponseStatus(value = HttpStatus.NO_CONTENT)
    public void changeMapPublish(@RequestBody String value, @PathVariable int id) throws WiseMappingException {

        final MindMap mindMap = mindmapService.getMindmapById(id);
        final User user = Utils.getUser();

        if (!mindMap.getOwner().equals(user)) {
            throw new IllegalArgumentException("No enough to execute this operation");
        }

        // Update map status ...
        mindMap.setPublic(Boolean.parseBoolean(value));
        updateMindmap(true, mindMap, user);

    }

    @RequestMapping(method = RequestMethod.DELETE, value = "/maps/{id}")
    @ResponseStatus(value = HttpStatus.NO_CONTENT)
    public void updateMap(@PathVariable int id) throws IOException, WiseMappingException {
        final User user = Utils.getUser();
        final MindMap mindmap = mindmapService.getMindmapById(id);
        mindmapService.removeMindmap(mindmap, user);
    }

    @RequestMapping(method = RequestMethod.DELETE, value = "/maps/batch")
    @ResponseStatus(value = HttpStatus.NO_CONTENT)
    public void batchDelete(@RequestParam(required = true) String ids) throws IOException, WiseMappingException {
        final User user = Utils.getUser();
        final String[] mapsIds = ids.split(",");
        for (final String mapId : mapsIds) {
            final MindMap mindmap = mindmapService.getMindmapById(Integer.parseInt(mapId));
            mindmapService.removeMindmap(mindmap, user);
        }
    }

    @RequestMapping(method = RequestMethod.PUT, value = "/maps/{id}/xml", consumes = {"application/xml"}, produces = {"application/json", "text/html", "application/xml"})
    @ResponseStatus(value = HttpStatus.NO_CONTENT)
    public void updateMapXml(@RequestBody String xml, @PathVariable int id, @RequestParam(required = false) boolean minor) throws IOException, WiseMappingException {

        final MindMap mindMap = mindmapService.getMindmapById(id);
        final User user = Utils.getUser();

        if (xml == null || xml.isEmpty()) {
            throw new IllegalArgumentException("Map xml can not be null");
        }
        mindMap.setXmlStr(xml);

        // Update map ...
        updateMindmap(minor, mindMap, user);
    }

    private void updateMindmap(boolean minor, @NotNull final MindMap mindMap, @NotNull final User user) throws WiseMappingException {
        final Calendar now = Calendar.getInstance();
        mindMap.setLastModificationTime(now);
        mindMap.setLastModifierUser(user.getUsername());
        mindmapService.updateMindmap(mindMap, minor);
    }

    @RequestMapping(method = RequestMethod.POST, value = "/maps", consumes = {"application/xml", "application/json"})
    @ResponseStatus(value = HttpStatus.CREATED)
    public void createMap(@RequestBody RestMindmap restMindmap, @NotNull HttpServletResponse response) throws IOException, WiseMappingException {

        // Validate ...
        final BindingResult result = new BeanPropertyBindingResult(restMindmap, "");
        new MapInfoValidator(mindmapService).validate(restMindmap.getDelegated(), result);
        if (result.hasErrors()) {
            throw new ValidationException(result);
        }

        // Some basic validations ...
        final User user = Utils.getUser();

        // If the user has not specified the xml content, add one ...
        final MindMap delegated = restMindmap.getDelegated();
        String xml = restMindmap.getXml();
        if (xml == null || xml.isEmpty()) {
            xml = MindMap.getDefaultMindmapXml(restMindmap.getTitle());
        }
        delegated.setOwner(user);
        delegated.setXmlStr(xml);

        // Add new mindmap ...
        mindmapService.addMindmap(delegated, user);

        // Return the new created map ...
        response.setHeader("Location", "/service/maps/" + delegated.getId());
        response.setHeader("ResourceId", Integer.toString(delegated.getId()));
    }

    @RequestMapping(method = RequestMethod.POST, value = "/maps/{id}", consumes = {"application/xml", "application/json"})
    @ResponseStatus(value = HttpStatus.CREATED)
    public void copyMap(@RequestBody RestMindmapInfo restMindmap, @PathVariable int id, @NotNull HttpServletResponse response) throws IOException, WiseMappingException {
        // Validate ...
        final BindingResult result = new BeanPropertyBindingResult(restMindmap, "");
        new MapInfoValidator(mindmapService).validate(restMindmap.getDelegated(), result);
        if (result.hasErrors()) {
            throw new ValidationException(result);
        }

        // Some basic validations ...
        final User user = Utils.getUser();

        // Create a shallowCopy of the map ...
        final MindMap mindMap = mindmapService.getMindmapById(id);
        final MindMap clonedMap = mindMap.shallowClone();
        clonedMap.setTitle(restMindmap.getTitle());
        clonedMap.setDescription(restMindmap.getDescription());
        clonedMap.setOwner(user);

        // Add new mindmap ...
        mindmapService.addMindmap(clonedMap, user);

        // Return the new created map ...
        response.setHeader("Location", "/service/maps/" + clonedMap.getId());
        response.setHeader("ResourceId", Integer.toString(clonedMap.getId()));
    }

}
